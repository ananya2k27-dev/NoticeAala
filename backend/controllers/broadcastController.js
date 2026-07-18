const Reminder = require("../models/Reminder");
const Subscriber = require("../models/Subscriber");
const { extractNoticeDetails } = require("../services/geminiService");
const { sendWhatsAppMessage } = require("../services/twilioService");

const CATEGORIES = ["exam", "fee", "placement", "event", "other"];

/**
 * POST /api/broadcast
 * Body: {
 *   adminToken: string,              // shared secret, checked against DASHBOARD_ADMIN_TOKEN
 *   sections: string[],              // e.g. ["CSE-DS-3"] — only these students are notified
 *   base64Data: string,              // the notice file, base64-encoded
 *   mimeType: string,                // e.g. "image/jpeg" or "application/pdf"
 *   categoryOverride?: string,       // optional — skip Gemini's guess and force a category
 * }
 *
 * This is the dashboard equivalent of forwarding a notice photo to the WhatsApp bot as an
 * admin: same extraction pipeline, same Reminder documents, same WhatsApp delivery — but
 * initiated from the UI instead of WhatsApp, and explicitly scoped to whichever section(s)
 * the teacher picks (not just the section the admin's own number happens to be subscribed to).
 */
async function sendBroadcast(req, res) {
  try {
    const { adminToken, sections, base64Data, mimeType, categoryOverride } = req.body;

    if (!process.env.DASHBOARD_ADMIN_TOKEN || adminToken !== process.env.DASHBOARD_ADMIN_TOKEN) {
      return res.status(401).json({ message: "Invalid admin token" });
    }
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ message: "At least one target section is required" });
    }
    if (!base64Data || !mimeType) {
      return res.status(400).json({ message: "A notice file (base64Data + mimeType) is required" });
    }

    const normalizedSections = sections.map((s) => s.trim().toUpperCase()).filter(Boolean);

    const extracted = await extractNoticeDetails(base64Data, mimeType);
    const category =
      categoryOverride && CATEGORIES.includes(categoryOverride) ? categoryOverride : extracted.category;

    const sourceType = mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("image")
      ? "image"
      : "document";

    const students = await Subscriber.find({ section: { $in: normalizedSections } });

    if (students.length === 0) {
      return res.status(404).json({ message: "No subscribers found for the selected section(s)" });
    }

    const dateLine = extracted.eventDate
      ? `Date: ${extracted.eventDate}${extracted.eventTime ? " " + extracted.eventTime : ""}\n`
      : "";

    let sentCount = 0;
    const createdReminders = [];

    for (const student of students) {
      const reminder = await Reminder.create({
        phoneNumber: student.phoneNumber,
        title: extracted.title,
        category,
        section: student.section,
        eventDate: extracted.eventDate ? new Date(extracted.eventDate) : undefined,
        eventTime: extracted.eventTime,
        actionRequired: extracted.actionRequired,
        urgency: extracted.urgency,
        summary: extracted.summary,
        sourceType,
      });
      createdReminders.push(reminder);

      try {
        await sendWhatsAppMessage(
          student.phoneNumber,
          `New notice for *${student.section}*:\n\n*${reminder.title}*\n${dateLine}Category: ${category}\n${extracted.actionRequired ? "Action: " + extracted.actionRequired + "\n" : ""}`
        );
        sentCount += 1;
      } catch (sendErr) {
        console.error(`Failed to WhatsApp ${student.phoneNumber}:`, sendErr.message);
      }
    }

    res.json({
      message: `Sent to ${sentCount} of ${students.length} student(s) across ${normalizedSections.join(", ")}`,
      extracted: { ...extracted, category },
      remindersCreated: createdReminders.length,
    });
  } catch (err) {
    console.error("Broadcast error:", err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { sendBroadcast };