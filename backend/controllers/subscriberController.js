const Subscriber = require("../models/Subscriber");

// GET /api/subscribers/sections — distinct list of sections, for the admin panel's dropdown
async function listSections(req, res) {
  try {
    const sections = await Subscriber.distinct("section");
    res.json(sections.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listSections };