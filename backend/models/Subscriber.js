const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // so "cse-ds-3" and "CSE-DS-3" match
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscriber", subscriberSchema);