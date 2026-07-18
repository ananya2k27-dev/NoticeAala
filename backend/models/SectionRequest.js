const mongoose = require("mongoose");

/**
 * A student can only belong to ONE section at a time. Once they've registered a section,
 * asking to switch (via WhatsApp "subscribe <newSection>" or the dashboard) does NOT change
 * it directly — it creates a SectionRequest that a teacher/admin must approve or deny, from
 * either WhatsApp ("approve <phone>" / "deny <phone>") or the dashboard's Admin panel.
 *
 * Once resolved, status flips to "approved"/"denied" and the dashboard stops showing it
 * (it only ever fetches status: "pending").
 */
const sectionRequestSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    currentSection: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    requestedSection: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
      index: true,
    },
    resolvedBy: {
      type: String, // "whatsapp" or "dashboard"
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SectionRequest", sectionRequestSchema);