const cron = require("node-cron");
const Reminder = require("../models/Reminder");
const { sendWhatsAppMessage } = require("./twilioService");

/**
 * Runs once a day at 8:00 AM server time.
 * Finds pending reminders whose eventDate falls within the next 48 hours
 * and haven't been nudged yet, then sends a WhatsApp nudge for each.
 */
function startReminderScheduler() {
  cron.schedule("0 8 * * *", async () => {
    console.log("Running daily reminder nudge check...");
    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const dueReminders = await Reminder.find({
        status: "pending",
        nudgeSent: false,
        eventDate: { $gte: now, $lte: in48Hours },
      });

      for (const reminder of dueReminders) {
        try {
          await sendWhatsAppMessage(
            reminder.phoneNumber,
            `Reminder: *${reminder.title}* is coming up${
              reminder.eventDate
                ? " on " + reminder.eventDate.toDateString()
                : ""
            }.\n${reminder.actionRequired ? "Action needed: " + reminder.actionRequired : ""}`
          );
          reminder.nudgeSent = true;
          await reminder.save();
        } catch (sendErr) {
          console.error(
            `Failed to send nudge for reminder ${reminder._id}:`,
            sendErr.message
          );
        }
      }

      console.log(`Sent ${dueReminders.length} nudges.`);
    } catch (err) {
      console.error("Reminder scheduler error:", err.message);
    }
  });
}

module.exports = { startReminderScheduler };
