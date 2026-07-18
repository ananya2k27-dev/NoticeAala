const express = require("express");
const router = express.Router();
const { listPending, approve, deny } = require("../controllers/sectionRequestController");

router.get("/pending", listPending);
router.post("/:id/approve", approve);
router.post("/:id/deny", deny);

module.exports = router;
