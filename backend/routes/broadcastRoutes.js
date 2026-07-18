const express = require("express");
const router = express.Router();
const { sendBroadcast } = require("../controllers/broadcastController");

router.post("/", sendBroadcast);

module.exports = router;