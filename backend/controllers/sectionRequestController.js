const SectionRequest = require("../models/SectionRequest");
const Subscriber = require("../models/Subscriber");
const { sendWhatsAppMessage } = require("../services/twilioService");

function checkAdmin(req, res) {
  const { adminToken } = req.body.adminToken !== undefined ? req.body : req.query;
  if (!process.env.DASHBOARD_ADMIN_TOKEN || adminToken !== process.env.DASHBOARD_ADMIN_TOKEN) {
    res.status(401).json({ message: "Invalid admin token" });
    return false;
  }
  return true;
}

// GET /api/section-requests/pending?adminToken=...
async function listPending(req, res) {
  if (!checkAdmin(req, res)) return;
  try {
    const requests = await SectionRequest.find({ status: "pending" }).sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/section-requests/:id/approve  { adminToken }
async function approve(req, res) {
  if (!checkAdmin(req, res)) return;
  try {
    const request = await SectionRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found or already resolved" });
    }

    await Subscriber.findOneAndUpdate(
      { phoneNumber: request.phoneNumber },
      { phoneNumber: request.phoneNumber, section: request.requestedSection },
      { upsert: true }
    );

    request.status = "approved";
    request.resolvedBy = "dashboard";
    await request.save();

    try {
      await sendWhatsAppMessage(
        request.phoneNumber,
        `Good news — your teacher approved your move to *${request.requestedSection}*.`
      );
    } catch (sendErr) {
      console.error("Failed to notify student of approval:", sendErr.message);
    }

    res.json({ message: `Approved — ${request.phoneNumber} moved to ${request.requestedSection}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/section-requests/:id/deny  { adminToken }
async function deny(req, res) {
  if (!checkAdmin(req, res)) return;
  try {
    const request = await SectionRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found or already resolved" });
    }

    request.status = "denied";
    request.resolvedBy = "dashboard";
    await request.save();

    try {
      await sendWhatsAppMessage(
        request.phoneNumber,
        `Your request to switch to *${request.requestedSection}* was declined by your teacher. You're still in *${request.currentSection}*.`
      );
    } catch (sendErr) {
      console.error("Failed to notify student of denial:", sendErr.message);
    }

    res.json({ message: `Denied — ${request.phoneNumber} stays in ${request.currentSection}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listPending, approve, deny };