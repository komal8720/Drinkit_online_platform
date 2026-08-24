// ==========================================================
// DRINKIT - USER ROUTER
// ==========================================================

const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { pool } = require("../config/db");

const router = express.Router();


// ==========================================================
// PRODUCTS (SEARCH & LISTING)
// ==========================================================

router.get("/products", async (req, res, next) => {
    try {
        const searchQuery = req.query.search || "";
        const categoryFilter = req.query.category || "";
        const typeFilter = req.query.type || "";
        const sort = req.query.sort || "popular";

        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.status = 'approved'
        `;
        const params = [];

        if (searchQuery.trim()) {
            const wildcard = `%${searchQuery.trim()}%`;
            query += " AND (p.name LIKE ? OR c.name LIKE ? OR p.description LIKE ?)";
            params.push(wildcard, wildcard, wildcard);
        }

        if (categoryFilter.trim()) {
            query += " AND c.slug = ?";
            params.push(categoryFilter.trim());
        }

        if (typeFilter.trim()) {
            if (typeFilter === "alcoholic") {
                query += " AND (p.alcohol_percentage > 0 OR p.is_age_restricted = 1)";
            } else if (typeFilter === "non-alcoholic") {
                query += " AND (p.alcohol_percentage = 0 OR p.alcohol_percentage IS NULL OR p.is_age_restricted = 0)";
            }
        }

        // Apply sorting
        if (sort === "latest") {
            query += " ORDER BY p.created_at DESC";
        } else if (sort === "low") {
            query += " ORDER BY p.price ASC";
        } else if (sort === "high") {
            query += " ORDER BY p.price DESC";
        } else {
            // Default: popular / featured
            query += " ORDER BY p.is_featured DESC, p.created_at DESC";
        }

        const [products] = await pool.query(query, params);

        // Fetch categories for filter sidebar/pills
        const [categories] = await pool.query("SELECT * FROM categories WHERE status = 'active'");

        res.render("user/products", {
            title: "Shop - Drinkit",
            products,
            categories,
            searchQuery,
            categoryFilter,
            typeFilter,
            sort
        });
    } catch (error) {
        console.error("❌ Error fetching products:", error);
        next(error);
    }
});


// ==========================================================
// SET LOCATION (AJAX Endpoint)
// ==========================================================

router.post("/set-location", (req, res) => {
    const { location } = req.body;
    if (location && location.trim()) {
        req.session.location = location.trim();
        return res.json({ success: true, location: req.session.location });
    }
    return res.status(400).json({ success: false, message: "Invalid location" });
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