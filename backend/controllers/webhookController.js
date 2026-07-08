const Reminder = require("../models/Reminder");
const { extractNoticeDetails } = require("../services/geminiService");
const {
  downloadMediaAsBase64,
  sendWhatsAppMessage,
} = require("../services/twilioService");

/**
 * Handles incoming Twilio WhatsApp webhook.
 * Twilio sends form-encoded fields: From, NumMedia, MediaUrl0, MediaContentType0, Body
 */
async function handleWhatsAppWebhook(req, res) {
  // Respond to Twilio immediately so it doesn't retry/time out;
  // do the heavy lifting async and message the user once done.
  res.status(200).send("<Response></Response>");

  const from = req.body.From; // e.g. "whatsapp:+91XXXXXXXXXX"
  const numMedia = parseInt(req.body.NumMedia || "0", 10);

  try {
    if (numMedia < 1) {
      await sendWhatsAppMessage(
        from,
        "Send me a photo or PDF of a notice (exam schedule, fee deadline, placement drive, etc.) and I'll turn it into a reminder for you."
      );
      return;
    }

    const mediaUrl = req.body.MediaUrl0;
    const contentType = req.body.MediaContentType0;

    const { base64Data, mimeType } = await downloadMediaAsBase64(mediaUrl);
    const extracted = await extractNoticeDetails(base64Data, mimeType);

    const sourceType = mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("image")
      ? "image"
      : "document";

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

    const dateLine = extracted.eventDate
      ? `Date: ${extracted.eventDate}${extracted.eventTime ? " " + extracted.eventTime : ""}\n`
      : "";

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
