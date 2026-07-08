const Reminder = require("../models/Reminder");

// Normalizes phone numbers so the dashboard lookup matches WhatsApp's "whatsapp:+91..." format
function normalizePhone(phone) {
  if (!phone) return phone;
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

// GET /api/reminders?phone=+91XXXXXXXXXX
async function getReminders(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: "phone query param is required" });
    }
    const reminders = await Reminder.find({
      phoneNumber: normalizePhone(phone),
    }).sort({ eventDate: 1, urgency: -1 });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PATCH /api/reminders/:id
async function updateReminder(req, res) {
  try {
    const updated = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Reminder not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /api/reminders/:id
async function deleteReminder(req, res) {
  try {
    const deleted = await Reminder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Reminder not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getReminders, updateReminder, deleteReminder };
