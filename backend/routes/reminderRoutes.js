
const express = require("express");

const {
  getReminders,
  updateReminder,
  deleteReminder,
} = require("../controllers/reminderController");

const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", getReminders);
router.patch("/:id", updateReminder);
router.delete("/:id", deleteReminder);

module.exports = router;
