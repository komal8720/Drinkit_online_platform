// ==========================================================
// DRINKIT - DELIVERY PARTNER ROUTER
// Role authorization shell: Only role_id = 4 (DELIVERY_PARTNER) allowed
// ==========================================================

const express = require("express");
const { requireDeliveryPartner } = require("../middleware/role");

const router = express.Router();

// Enforce DELIVERY_PARTNER role authorization
router.use(requireDeliveryPartner);

// Delivery Partner Dashboard route (guarded by requireDeliveryPartner)
router.get("/dashboard", (req, res) => {
    res.render("delivery/dashboard", {
        title: "Delivery Partner Dashboard"
    });
});

module.exports = router;
