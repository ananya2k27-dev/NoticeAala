const express = require("express");
const router = express.Router();
const { handleWhatsAppWebhook } = require("../controllers/webhookController");

// Twilio sends application/x-www-form-urlencoded POST requests here
router.post("/whatsapp", handleWhatsAppWebhook);

module.exports = router;
