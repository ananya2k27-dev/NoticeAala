const Reminder = require("../models/Reminder");
const Subscriber = require("../models/Subscriber");
const { extractNoticeDetails, reviseNoticeDetails } = require("../services/geminiService");
const {
  downloadMediaAsBase64,
  sendWhatsAppMessage,
} = require("../services/twilioService");

// Comma-separated admin numbers set in Render env vars, e.g. "whatsapp:+919876543210,whatsapp:+911234567890"
const ADMIN_NUMBERS = (process.env.ADMIN_NUMBERS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const CORRECTION_KEYWORDS = ["no,", "no ", "correct", "actually", "fix", "wrong", "change it", "not "];

function looksLikeCorrection(text) {
  const lower = text.toLowerCase().trim();
  return CORRECTION_KEYWORDS.some((kw) => lower.startsWith(kw));
}

async function handleWhatsAppWebhook(req, res) {
  res.status(200).send("<Response></Response>");

  const from = req.body.From;
  const numMedia = parseInt(req.body.NumMedia || "0", 10);
  const bodyText = (req.body.Body || "").trim();

  try {
    // ---- Text-only messages: handle subscribe / correction / fallback ----
    if (numMedia < 1) {
      // "subscribe CSE-DS-3"
      if (bodyText.toLowerCase().startsWith("subscribe")) {
        const section = bodyText.split(/\s+/).slice(1).join(" ").trim();
        if (!section) {
          await sendWhatsAppMessage(from, 'Please tell me your section too, e.g. "subscribe CSE-DS-3".');
          return;
        }
        await Subscriber.findOneAndUpdate(
          { phoneNumber: from },
          { phoneNumber: from, section: section.toUpperCase() },
          { upsert: true, new: true }
        );
        await sendWhatsAppMessage(
          from,
          `You're subscribed to *${section.toUpperCase()}*. Your class rep's notices will now reach you automatically.`
        );
        return;
      }

      // Correction to the most recent reminder
      if (bodyText && looksLikeCorrection(bodyText)) {
        const lastReminder = await Reminder.findOne({ phoneNumber: from }).sort({ createdAt: -1 });
        if (!lastReminder) {
          await sendWhatsAppMessage(from, "You don't have any recent reminders for me to correct.");
          return;
        }

        const revised = await reviseNoticeDetails(
          {
            title: lastReminder.title,
            category: lastReminder.category,
            eventDate: lastReminder.eventDate ? lastReminder.eventDate.toISOString().split("T")[0] : "",
            eventTime: lastReminder.eventTime,
            actionRequired: lastReminder.actionRequired,
            urgency: lastReminder.urgency,
            summary: lastReminder.summary,
          },
          bodyText
        );

        lastReminder.title = revised.title;
        lastReminder.category = revised.category;
        lastReminder.eventDate = revised.eventDate ? new Date(revised.eventDate) : lastReminder.eventDate;
        lastReminder.eventTime = revised.eventTime;
        lastReminder.actionRequired = revised.actionRequired;
        lastReminder.urgency = revised.urgency;
        lastReminder.summary = revised.summary;
        await lastReminder.save();

        await sendWhatsAppMessage(
          from,
          `Updated:\n\n*${lastReminder.title}*\nDate: ${revised.eventDate}${revised.eventTime ? " " + revised.eventTime : ""}\nCategory: ${lastReminder.category}`
        );
        return;
      }

      // Fallback — original behavior
      await sendWhatsAppMessage(
        from,
        "Send me a photo or PDF of a notice (exam schedule, fee deadline, placement drive, etc.) and I'll turn it into a reminder for you."
      );
      return;
    }

    // ---- Media message: extract notice details ----
    const mediaUrl = req.body.MediaUrl0;
    const { base64Data, mimeType } = await downloadMediaAsBase64(mediaUrl);
    const extracted = await extractNoticeDetails(base64Data, mimeType);

    const sourceType = mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("image")
      ? "image"
      : "document";

    const dateLine = extracted.eventDate
      ? `Date: ${extracted.eventDate}${extracted.eventTime ? " " + extracted.eventTime : ""}\n`
      : "";

    // ---- Admin broadcast path ----
    if (ADMIN_NUMBERS.includes(from)) {
      const adminSub = await Subscriber.findOne({ phoneNumber: from });
      if (!adminSub) {
        await sendWhatsAppMessage(
          from,
          'You\'re an admin but not linked to a section yet. Send "subscribe CSE-DS-3" first, then resend the notice.'
        );
        return;
      }

      const students = await Subscriber.find({ section: adminSub.section });
      const recipients = students.length ? students.map((s) => s.phoneNumber) : [from];

      for (const phoneNumber of recipients) {
        const reminder = await Reminder.create({
          phoneNumber,
          title: extracted.title,
          category: extracted.category,
          eventDate: extracted.eventDate ? new Date(extracted.eventDate) : undefined,
          eventTime: extracted.eventTime,
          actionRequired: extracted.actionRequired,
          urgency: extracted.urgency,
          summary: extracted.summary,
          sourceType,
        });

        await sendWhatsAppMessage(
          phoneNumber,
          `New notice for *${adminSub.section}*:\n\n*${reminder.title}*\n${dateLine}Category: ${reminder.category}\n${extracted.actionRequired ? "Action: " + extracted.actionRequired + "\n" : ""}`
        );
      }

      await sendWhatsAppMessage(from, `Broadcast sent to ${recipients.length} student(s) in ${adminSub.section}.`);
      return;
    }

    // ---- Normal single-student path (unchanged) ----
    const reminder = await Reminder.create({
      phoneNumber: from,
      title: extracted.title,
      category: extracted.category,
      eventDate: extracted.eventDate ? new Date(extracted.eventDate) : undefined,
      eventTime: extracted.eventTime,
      actionRequired: extracted.actionRequired,
      urgency: extracted.urgency,
      summary: extracted.summary,
      sourceType,
    });

    await sendWhatsAppMessage(
      from,
      `Got it — added to your reminders:\n\n*${reminder.title}*\n${dateLine}Category: ${reminder.category}\n${extracted.actionRequired ? "Action: " + extracted.actionRequired + "\n" : ""}\nView all your reminders on your dashboard.`
    );
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    try {
      await sendWhatsAppMessage(
        from,
        "Sorry, I couldn't read that notice clearly. Try sending a clearer photo or a text-based PDF."
      );
    } catch (sendErr) {
      console.error("Failed to send error message:", sendErr.message);
    }
  }
}

module.exports = { handleWhatsAppWebhook };
