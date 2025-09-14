const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Land = require("../models/Land");

function attachUrls(lands, gateway = "https://ipfs.io/ipfs") {
  lands.forEach((l) => {
    if (l.marketInfo?.images?.length) {
      l.marketInfo.imageUrls = l.marketInfo.images.map(h => `${gateway}/${h}`);
    } else {
      l.marketInfo = l.marketInfo || {};
      l.marketInfo.imageUrls = [];
    }
    if (l.originalDocument?.hash) {
      l.originalDocument.url = `${gateway}/${l.originalDocument.hash}`;
    }
    if (l.digitalDocument?.hash) {
      l.digitalDocument.url = `${gateway}/${l.digitalDocument.hash}`;
    }
  });
}

// GET /api/lands/marketplace
router.get("/marketplace", async (req, res) => {
  try {
    const lands = await Land.find({ "marketInfo.status": "listed" })
      .populate("owner", "name email")
      .lean();
    const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs";
    attachUrls(lands, gateway);
    res.json(lands);
  } catch (err) {
    console.error("Error fetching marketplace lands:", err);
    res.status(500).json({ message: "Failed to fetch marketplace lands" });
  }
});

// GET /api/lands/my-lands
router.get("/my-lands", authMiddleware, async (req, res) => {
  try {
    const lands = await Land.find({ owner: req.user.id })
      .lean();
    const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs";
    attachUrls(lands, gateway);
    res.json(lands);
  } catch (err) {
    console.error("Error fetching user lands:", err);
    res.status(500).json({ message: "Failed to fetch user lands" });
  }
});

module.exports = router;