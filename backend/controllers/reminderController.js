
const mongoose = require("mongoose");
const Reminder = require("../models/Reminder");

// Get the verified phone number from the authenticated user.
function getVerifiedPhone(req) {
  if (!req.user || !req.user.phoneVerified || !req.user.phoneNumber) {
    return null;
  }

  return req.user.phoneNumber;
}

// GET /api/reminders
async function getReminders(req, res) {
  try {
    const phoneNumber = getVerifiedPhone(req);

    if (!phoneNumber) {
      return res.status(403).json({
        message: "Link and verify your WhatsApp number first",
      });
    }

    const reminders = await Reminder.find({ phoneNumber })
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    return res.status(200).json(reminders);

  } catch (err) {
    console.error("Get reminders error:", err);

    return res.status(500).json({
      message: "Unable to fetch reminders",
    });
  }
}

// PATCH /api/reminders/:id
async function updateReminder(req, res) {
  try {
    const { id } = req.params;

    const phoneNumber = getVerifiedPhone(req);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid reminder ID",
      });
    }

    if (!phoneNumber) {
      return res.status(403).json({
        message: "Link and verify your WhatsApp number first",
      });
    }

    // Only allow modification of the reminder status.
    const allowedFields = ["status"];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided",
      });
    }

    if (
      updates.status !== undefined &&
      !["pending", "done"].includes(updates.status)
    ) {
      return res.status(400).json({
        message: "Status must be pending or done",
      });
    }

    // Update only if the reminder belongs to the authenticated user.
    const updated = await Reminder.findOneAndUpdate(
      {
        _id: id,
        phoneNumber: phoneNumber,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Reminder not found",
      });
    }

    return res.status(200).json(updated);

  } catch (err) {
    console.error("Update reminder error:", err);

    return res.status(500).json({
      message: "Unable to update reminder",
    });
  }
}

// DELETE /api/reminders/:id
async function deleteReminder(req, res) {
  try {
    const { id } = req.params;

    const phoneNumber = getVerifiedPhone(req);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid reminder ID",
      });
    }

    if (!phoneNumber) {
      return res.status(403).json({
        message: "Link and verify your WhatsApp number first",
      });
    }

    // Delete only if the reminder belongs to the authenticated user.
    const deleted = await Reminder.findOneAndDelete({
      _id: id,
      phoneNumber: phoneNumber,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Reminder not found",
      });
    }

    return res.status(200).json({
      message: "Reminder deleted successfully",
    });

  } catch (err) {
    console.error("Delete reminder error:", err);

    return res.status(500).json({
      message: "Unable to delete reminder",
    });
  }
}

module.exports = {
  getReminders,
  updateReminder,
  deleteReminder,
};