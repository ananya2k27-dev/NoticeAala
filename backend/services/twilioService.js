const axios = require("axios");
const twilio = require("twilio");

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

/**
 * Downloads media from a Twilio media URL as base64.
 * Twilio media URLs require basic auth with your account credentials.
 */
async function downloadMediaAsBase64(mediaUrl) {
  const response = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
  });

  const base64Data = Buffer.from(response.data, "binary").toString("base64");
  const mimeType = response.headers["content-type"] || "image/jpeg";
  return { base64Data, mimeType };
}

/**
 * Sends a plain text WhatsApp message via Twilio.
 * @param {string} to - recipient in "whatsapp:+91XXXXXXXXXX" format
 * @param {string} body - message text
 */
async function sendWhatsAppMessage(to, body) {
  const client = getClient();
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  });
}

module.exports = { downloadMediaAsBase64, sendWhatsAppMessage };
