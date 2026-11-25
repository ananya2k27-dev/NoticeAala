
const crypto = require("crypto");
const User = require("../models/User");
const { sendOTP } = require("../config/mailer");
const { createToken } = require("../utils/token");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function requestOTP(req, res) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!validEmail(email)) {
      return res.status(400).json({
        message: "Enter a valid email address",
      });
    }

    let user = await User.findOne({ email }).select(
      "+otpLastSentAt"
    );

    const now = Date.now();

    if (
      user?.otpLastSentAt &&
      now - user.otpLastSentAt.getTime() < RESEND_DELAY_MS
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another code",
      });
    }

    if (!user) {
      user = new User({ email });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = new Date(now + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date(now);

    await user.save();

    try {
      await sendOTP(email, otp);
    } catch (mailError) {
      console.error("Email delivery failed:", mailError);

      user.otpHash = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.status(503).json({
        message: "Unable to send verification email",
      });
    }

    return res.status(200).json({
      message: "Verification code sent",
    });
  } catch (err) {
    console.error("Request OTP error:", err);

    return res.status(500).json({
      message: "Unable to process request",
    });
  }
}

async function verifyOTP(req, res) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const otp = String(req.body.otp || "").trim();

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Valid email and 6-digit code are required",
      });
    }

    const user = await User.findOne({ email }).select(
      "+otpHash +otpExpiresAt +otpAttempts"
    );

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({
        message: "Request a new verification code",
      });
    }

    if (user.otpAttempts >= MAX_ATTEMPTS) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.status(429).json({
        message: "Too many attempts. Request a new code",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.status(400).json({
        message: "Verification code expired",
      });
    }

    user.otpAttempts += 1;

    const suppliedHash = hashOTP(otp);

    const valid =
      suppliedHash.length === user.otpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(suppliedHash, "hex"),
        Buffer.from(user.otpHash, "hex")
      );

    if (!valid) {
      await user.save();

      return res.status(400).json({
        message: "Incorrect verification code",
      });
    }

    user.emailVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    await user.save();

    const token = createToken(user._id.toString());

    return res.status(200).json({
      message: "Email verified",
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);

    return res.status(500).json({
      message: "Unable to verify code",
    });
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    id: req.user._id,
    email: req.user.email,
    emailVerified: req.user.emailVerified,
    phoneNumber: req.user.phoneNumber,
    phoneVerified: req.user.phoneVerified,
  });
}

module.exports = {
  requestOTP,
  verifyOTP,
  getMe,
};