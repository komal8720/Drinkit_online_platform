// ==========================================================
// DRINKIT - USER ROUTER
// ==========================================================

const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");

const router = express.Router();


// ==========================================================
// PRODUCTS
// ==========================================================

router.get("/products", (req, res) => {
    res.render("user/products", {
        title: "Shop - Drinkit"
    });
});


// ==========================================================
// PROFILE
// ==========================================================

router.get("/profile", ensureAuthenticated, (req, res) => {
    res.render("user/profile", {
        title: "My Profile - Drinkit",
        user: req.session.user
    });
});


// ==========================================================
// ORDERS
// ==========================================================

router.get("/orders", ensureAuthenticated, (req, res) => {
    res.render("user/orders", {
        title: "My Orders - Drinkit",
        user: req.session.user
    });
});


// ==========================================================
// WISHLIST
// ==========================================================

router.get("/wishlist", ensureAuthenticated, (req, res) => {
    res.render("user/wishlist", {
        title: "My Wishlist - Drinkit",
        user: req.session.user
    });
});


// ==========================================================
// CART
// ==========================================================

router.get("/cart", ensureAuthenticated, (req, res) => {
    res.render("user/cart", {
        title: "My Cart - Drinkit",
        user: req.session.user
    });
});

module.exports = router;