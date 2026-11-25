
const User = require("../models/User");
const { verifyToken } = require("../utils/token");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        message: "Invalid or expired session",
      });
    }

    const user = await User.findById(decoded.sub).select(
      "_id email emailVerified phoneNumber phoneVerified"
    );

    if (!user || !user.emailVerified) {
      return res.status(401).json({
        message: "Verified account required",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    console.error("Authentication error:", err);

    return res.status(401).json({
      message: "Authentication failed",
    });
  }
}

module.exports = { requireAuth };