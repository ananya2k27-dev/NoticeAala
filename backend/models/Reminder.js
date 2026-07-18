const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    // Identifies the student - phone number is the identifier since WhatsApp is the ingestion channel
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["exam", "fee", "placement", "event", "other"],
      default: "other",
    },
    // Which class section this reminder was targeted to, if it came from an admin/teacher
    // broadcast. Empty for reminders a student created themselves by forwarding a notice.
    section: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    eventDate: {
      type: Date,
      required: false,
    },
    eventTime: {
      type: String, // stored as raw string e.g. "10:00 AM" since not all notices give exact times
      default: "",
    },
    actionRequired: {
      type: String,
      default: "",
    },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    summary: {
      type: String,
      default: "",
    },
    sourceType: {
      type: String,
      enum: ["image", "pdf", "document"],
      default: "image",
    },
    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
    },
    // DEPRECATED: kept so existing documents don't break; superseded by nudgeStages below.
    nudgeSent: {
      type: Boolean,
      default: false,
    },
    // Tracks which alert "stages" have already fired for this reminder, so the scheduler
    // never sends the same stage twice. Possible values: "48h", "24h", "12h", "3h".
    nudgeStages: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
