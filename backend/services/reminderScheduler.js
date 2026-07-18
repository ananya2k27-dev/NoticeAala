const cron = require("node-cron");
const Reminder = require("../models/Reminder");
const { sendWhatsAppMessage } = require("./twilioService");

/**
 * Alert stages, defined as "hours remaining before the deadline".
 * The scheduler checks every 3 hours (see cron.schedule below), so a stage fires
 * the first time the reminder's remaining time drops at or below its threshold.
 *
 * Design intent (answers "how many alerts in the last 24 hours, at what interval"):
 *   - One heads-up 2 days out ("48h") — so the reminder isn't a surprise.
 *   - Three alerts inside the final 24 hours: at ~24h, ~12h, and ~3h remaining.
 *     That's roughly every 9-12 hours, tightening as the deadline gets closer,
 *     without spamming the student every 3 hours just because the cron runs that often.
 */
const STAGES = [
  { key: "48h", maxHours: 48, label: "Reminder" },
  { key: "24h", maxHours: 24, label: "1 day left" },
  { key: "12h", maxHours: 12, label: "12 hours left" },
  { key: "3h", maxHours: 3, label: "Final reminder — a few hours left" },
];

function buildMessage(reminder, stageLabel) {
  const dateLine = reminder.eventDate
    ? ` on ${reminder.eventDate.toDateString()}${reminder.eventTime ? " " + reminder.eventTime : ""}`
    : "";
  return (
    `*${stageLabel}:* ${reminder.title}${dateLine}.\n` +
    (reminder.actionRequired ? `Action needed: ${reminder.actionRequired}` : "")
  );
}

/**
 * Runs every 3 hours. For every pending reminder, works out how many hours remain
 * until eventDate and sends the most urgent stage that hasn't fired yet.
 */
function startReminderScheduler() {
  cron.schedule("0 */3 * * *", async () => {
    console.log("Running reminder nudge check...");
    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const dueReminders = await Reminder.find({
        status: "pending",
        eventDate: { $gte: now, $lte: in48Hours },
      });

      let sentCount = 0;

      for (const reminder of dueReminders) {
        const hoursRemaining = (reminder.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Find the most urgent stage whose threshold we've crossed and that hasn't fired yet.
        const stageToSend = STAGES.find(
          (s) => hoursRemaining <= s.maxHours && !reminder.nudgeStages.includes(s.key)
        );

        if (!stageToSend) continue;

        try {
          await sendWhatsAppMessage(
            reminder.phoneNumber,
            buildMessage(reminder, stageToSend.label)
          );
          reminder.nudgeStages.push(stageToSend.key);
          reminder.nudgeSent = true; // keep legacy field in sync
          await reminder.save();
          sentCount += 1;
        } catch (sendErr) {
          console.error(
            `Failed to send ${stageToSend.key} nudge for reminder ${reminder._id}:`,
            sendErr.message
          );
        }
      }

      console.log(`Sent ${sentCount} nudge(s).`);
    } catch (err) {
      console.error("Reminder scheduler error:", err.message);
    }
  });
}

module.exports = { startReminderScheduler };
