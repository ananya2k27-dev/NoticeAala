const Reminder = require("../models/Reminder");

/**
 * Duplicate detector for incoming notices.
 *
 * Why this exists: the same physical notice often reaches the bot more than once —
 * forwarded by multiple students, or re-sent by faculty with a slightly reworded caption
 * or a re-cropped photo. Comparing raw extracted text directly fails because wording,
 * punctuation, and formatting differ even when the underlying event is identical.
 *
 * Instead we compare the *structured fields* Gemini already extracted (category, eventDate,
 * title) since those normalize away most formatting noise. category and eventDate must match
 * exactly; title only needs to be "similar enough" (Jaccard similarity on normalized word
 * sets), which tolerates rewording without needing a heavier NLP/embedding dependency.
 */

// Lowercase, strip punctuation, collapse whitespace — so "Mid-Sem Exam!" and
// "mid sem exam" normalize to the same word set.
function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    // Replace punctuation with a space (not remove it) — "Mid-Sem" should split into
    // "mid" and "sem" so it matches a differently-punctuated "Mid Sem", not collapse
    // into the single token "midsem" which would never match anything else.
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Jaccard similarity between two titles' word sets: |intersection| / |union|, range 0..1.
// 1 = identical word sets, 0 = no words in common.
function titleSimilarity(a, b) {
  const wordsA = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection += 1;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Titles need to overlap at least this much (after normalization) to count as "the same
// notice." Set from test cases against realistic reworded pairs, e.g.:
//   "Mid-Sem Exam Schedule Released" vs "Mid Sem Exam Timetable Out" -> 0.43 similarity
//   "Placement Drive - TCS on 5th Oct" vs "TCS Placement Drive 5th October" -> 0.57
//   "Fee Payment Deadline Extended" vs "Library Book Return Deadline" -> 0.14
// 0.4 catches the exam-notice rewording (a real re-forward) while staying well below the
// score for two genuinely different notices in the same category (0.14) — 0.5 was too
// strict and would have let that first case through as "not a duplicate."
const SIMILARITY_THRESHOLD = 0.4;

// Only compare against reminders created in the last few days for this recipient. A 3-month
// -old reminder with a similar title is very unlikely to be the same notice resurfacing, and
// bounding the window keeps the duplicate-check query small instead of scanning full history.
const DEDUP_WINDOW_DAYS = 5;

/**
 * Checks whether a newly-extracted notice is a duplicate of a reminder this phone number
 * already has pending. Returns the existing duplicate Reminder document if found, else null.
 *
 * @param {string} phoneNumber - recipient, e.g. "whatsapp:+91XXXXXXXXXX"
 * @param {object} extracted - { title, category, eventDate, ... } as returned by geminiService
 */
async function findDuplicateReminder(phoneNumber, extracted) {
  const since = new Date(Date.now() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Narrow with an indexed/cheap filter first (phoneNumber is indexed; category and a date
  // floor cut the candidate set down) before doing the more expensive similarity check in JS.
  const candidates = await Reminder.find({
    phoneNumber,
    category: extracted.category,
    status: "pending",
    createdAt: { $gte: since },
  });

  for (const candidate of candidates) {
    const candidateDateStr = candidate.eventDate
      ? candidate.eventDate.toISOString().split("T")[0]
      : "";
    const sameDate = candidateDateStr === (extracted.eventDate || "");
    if (!sameDate) continue;

    if (titleSimilarity(candidate.title, extracted.title) >= SIMILARITY_THRESHOLD) {
      return candidate;
    }
  }

  return null;
}

module.exports = { findDuplicateReminder, titleSimilarity, normalizeTitle };
