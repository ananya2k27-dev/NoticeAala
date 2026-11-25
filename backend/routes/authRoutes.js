
const express = require("express");

const {
  requestOTP,
  verifyOTP,
  getMe,
} = require("../controllers/authController");

const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);
router.get("/me", requireAuth, getMe);

module.exports = router;