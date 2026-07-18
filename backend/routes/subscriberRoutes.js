const express = require("express");
const router = express.Router();
const { listSections } = require("../controllers/subscriberController");

router.get("/sections", listSections);

module.exports = router;