const express = require("express");
const router = express.Router();
const {
  getReminders,
  updateReminder,
  deleteReminder,
} = require("../controllers/reminderController");

router.get("/", getReminders);
router.patch("/:id", updateReminder);
router.delete("/:id", deleteReminder);

module.exports = router;
