// ==========================================================
// DRINKIT - VENDOR ROUTER
// Role authorization shell: Only role_id = 2 (VENDOR) allowed
// Vendor module implementation deferred as instructed
// ==========================================================

const express = require("express");
const { requireVendor } = require("../middleware/role");

const router = express.Router();

// Enforce VENDOR role authorization
router.use(requireVendor);

// Vendor Dashboard route (guarded by requireVendor)
router.get("/dashboard", (req, res) => {
    res.render("vendor/dashboard", {
        title: "Vendor Dashboard"
    });
});

module.exports = router;
