const axios = require("axios");

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT = `You are an assistant that reads Indian college notices (which may be photos of notice boards, WhatsApp screenshots, or scanned PDFs, and may mix Hindi and English).

Extract the event details and return ONLY valid JSON, no markdown fences, no extra text, in this exact shape:

{
  "title": "short descriptive title",
  "category": "one of: exam, fee, placement, event, other",
  "eventDate": "YYYY-MM-DD or empty string if not found",
  "eventTime": "human readable time or empty string if not found",
  "actionRequired": "what the student needs to do, one short sentence",
  "urgency": "one of: low, medium, high",
  "summary": "1-2 sentence plain-English summary of the notice"
}

If the notice contains multiple events, pick the single most important/urgent one.
If a field truly cannot be determined, use an empty string for that field (never omit a key).`;

/**
 * Sends a base64-encoded file (image or PDF) to Gemini and returns structured JSON.
 * @param {string} base64Data - base64 encoded file content
 * @param {string} mimeType - e.g. "image/jpeg", "application/pdf"
 * @returns {Promise<object>} structured extraction result
 */
async function extractNoticeDetails(base64Data, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await axios.post(
    `${GEMINI_URL}?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            { text: EXTRACTION_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    },
    { headers: { "Content-Type": "application/json" } }
  );

  const rawText =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    // Fallback: strip any accidental markdown fences and retry once
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  return {
    title: parsed.title || "Untitled notice",
    category: ["exam", "fee", "placement", "event", "other"].includes(
      parsed.category
    )
      ? parsed.category
      : "other",
    eventDate: parsed.eventDate || "",
    eventTime: parsed.eventTime || "",
    actionRequired: parsed.actionRequired || "",
    urgency: ["low", "medium", "high"].includes(parsed.urgency)
      ? parsed.urgency
      : "medium",
    summary: parsed.summary || "",
  };
}

module.exports = { extractNoticeDetails };
