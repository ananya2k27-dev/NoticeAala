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
    nudgeSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
