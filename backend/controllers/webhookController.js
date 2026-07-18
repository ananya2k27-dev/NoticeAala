const Reminder = require("../models/Reminder");
const Subscriber = require("../models/Subscriber");
const SectionRequest = require("../models/SectionRequest");
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

function normalizeAdminPhone(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

async function notifyAdmins(text) {
  for (const admin of ADMIN_NUMBERS) {
    try {
      await sendWhatsAppMessage(admin, text);
    } catch (err) {
      console.error(`Failed to notify admin ${admin}:`, err.message);
    }
  }
}

// Lets an admin target arbitrary sections from WhatsApp, the same way the dashboard's
// Admin panel lets them pick any section(s) instead of only their own. Caption examples:
//   "to: CSE-DS-3, CSE-DS-4"
//   "sections: CSE-DS-3"
function parseSectionsFromCaption(caption) {
  const match = caption.match(/^(?:to|section|sections)\s*:\s*(.+)$/i);
  if (!match) return null;
  const sections = match[1]
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return sections.length ? sections : null;
}

async function handleWhatsAppWebhook(req, res) {
  res.status(200).send("<Response></Response>");

  const from = req.body.From;
  const numMedia = parseInt(req.body.NumMedia || "0", 10);
  const bodyText = (req.body.Body || "").trim();

  try {
    // ---- Text-only messages: subscribe / approve / deny / correction / fallback ----
    if (numMedia < 1) {
      // ---- Admin: "approve +91XXXXXXXXXX" or "deny +91XXXXXXXXXX" ----
      if (ADMIN_NUMBERS.includes(from) && /^(approve|deny)\s+\S+/i.test(bodyText)) {
        const [cmd, rawPhone] = bodyText.split(/\s+/);
        const targetPhone = normalizeAdminPhone(rawPhone);
        const decision = cmd.toLowerCase() === "approve" ? "approved" : "denied";

        const request = await SectionRequest.findOne({ phoneNumber: targetPhone, status: "pending" });
        if (!request) {
          await sendWhatsAppMessage(from, `No pending section request found for ${rawPhone}.`);
          return;
        }

        if (decision === "approved") {
          await Subscriber.findOneAndUpdate(
            { phoneNumber: targetPhone },
            { phoneNumber: targetPhone, section: request.requestedSection },
            { upsert: true }
          );
          await sendWhatsAppMessage(
            targetPhone,
            `Good news — your teacher approved your move to *${request.requestedSection}*.`
          );
        } else {
          await sendWhatsAppMessage(
            targetPhone,
            `Your request to switch to *${request.requestedSection}* was declined by your teacher. You're still in *${request.currentSection}*.`
          );
        }

        request.status = decision;
        request.resolvedBy = "whatsapp";
        await request.save();

        await sendWhatsAppMessage(
          from,
          `${decision === "approved" ? "Approved" : "Denied"}: ${rawPhone} → ${request.requestedSection}.`
        );
        return;
      }

      // ---- "subscribe CSE-DS-3" ----
      if (bodyText.toLowerCase().startsWith("subscribe")) {
        const section = bodyText.split(/\s+/).slice(1).join(" ").trim().toUpperCase();
        if (!section) {
          await sendWhatsAppMessage(from, 'Please tell me your section too, e.g. "subscribe CSE-DS-3".');
          return;
        }

        const existing = await Subscriber.findOne({ phoneNumber: from });

        // First-ever registration — no approval needed.
        if (!existing) {
          await Subscriber.create({ phoneNumber: from, section });
          await sendWhatsAppMessage(
            from,
            `You're subscribed to *${section}*. Your class rep's notices will now reach you automatically.`
          );
          return;
        }

        if (existing.section === section) {
          await sendWhatsAppMessage(from, `You're already subscribed to *${section}*.`);
          return;
        }

        // Already in a different section — switching needs teacher approval.
        const request = await SectionRequest.findOneAndUpdate(
          { phoneNumber: from, status: "pending" },
          {
            phoneNumber: from,
            currentSection: existing.section,
            requestedSection: section,
            status: "pending",
          },
          { upsert: true, new: true }
        );

        await sendWhatsAppMessage(
          from,
          `You're currently in *${existing.section}*. I've sent your request to switch to *${section}* to your teacher — you'll hear back once it's reviewed.`
        );
        await notifyAdmins(
          `Section switch request: ${from} wants to move from ${existing.section} to ${section}.\nReply "approve ${from.replace("whatsapp:", "")}" or "deny ${from.replace("whatsapp:", "")}" to resolve, or use the dashboard.`
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

      // Fallback — original behavior, plus a hint about admin commands if relevant
      await sendWhatsAppMessage(
        from,
        ADMIN_NUMBERS.includes(from)
          ? 'Send me a notice photo/PDF to broadcast (add a caption like "to: CSE-DS-3" to target a specific section), or reply "approve <phone>" / "deny <phone>" to resolve a section-switch request.'
          : "Send me a photo or PDF of a notice (exam schedule, fee deadline, placement drive, etc.) and I'll turn it into a reminder for you."
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
      // A caption like "to: CSE-DS-3, CSE-DS-4" targets arbitrary sections, same as the
      // dashboard's Admin panel. Without a caption, it falls back to the admin's own section.
      const captionSections = parseSectionsFromCaption(bodyText);
      let targetSections;

      if (captionSections) {
        targetSections = captionSections;
      } else {
        const adminSub = await Subscriber.findOne({ phoneNumber: from });
        if (!adminSub) {
          await sendWhatsAppMessage(
            from,
            'You\'re an admin but not linked to a section yet. Send "subscribe CSE-DS-3" first, or add a caption like "to: CSE-DS-3" to this notice.'
          );
          return;
        }
        targetSections = [adminSub.section];
      }

      const students = await Subscriber.find({ section: { $in: targetSections } });
      const recipients = students.length ? students.map((s) => s.phoneNumber) : [from];
      const sectionForRecipient = new Map(students.map((s) => [s.phoneNumber, s.section]));

      for (const phoneNumber of recipients) {
        const section = sectionForRecipient.get(phoneNumber) || targetSections[0];
        const reminder = await Reminder.create({
          phoneNumber,
          title: extracted.title,
          category: extracted.category,
          section,
          eventDate: extracted.eventDate ? new Date(extracted.eventDate) : undefined,
          eventTime: extracted.eventTime,
          actionRequired: extracted.actionRequired,
          urgency: extracted.urgency,
          summary: extracted.summary,
          sourceType,
        });

        await sendWhatsAppMessage(
          phoneNumber,
          `New notice for *${section}*:\n\n*${reminder.title}*\n${dateLine}Category: ${reminder.category}\n${extracted.actionRequired ? "Action: " + extracted.actionRequired + "\n" : ""}`
        );
      }

      await sendWhatsAppMessage(
        from,
        `Broadcast sent to ${recipients.length} student(s) across ${targetSections.join(", ")}.`
      );
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
