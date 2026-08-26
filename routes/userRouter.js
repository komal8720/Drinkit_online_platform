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
        const brandFilter = req.query.brand || "";
        const typeFilter = req.query.type || "";
        const sort = req.query.sort || "popular";
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        // 1. Validate category if set
        let isInvalidCategory = false;
        let selectedCategory = null;
        if (categoryFilter.trim()) {
            const [catRows] = await pool.query("SELECT * FROM categories WHERE slug = ? AND status = 'active' LIMIT 1", [categoryFilter.trim()]);
            if (catRows.length > 0) {
                selectedCategory = catRows[0];
            } else {
                isInvalidCategory = true;
            }
        }

        const conditions = ["p.status = 'approved'"];
        const params = [];

        if (searchQuery.trim()) {
            const wildcard = `%${searchQuery.trim()}%`;
            conditions.push("(p.name LIKE ? OR c.name LIKE ? OR p.description LIKE ?)");
            params.push(wildcard, wildcard, wildcard);
        }

        if (categoryFilter.trim() && !isInvalidCategory) {
            conditions.push("c.slug = ?");
            params.push(categoryFilter.trim());
        }

        if (brandFilter.trim()) {
            conditions.push("b.slug = ?");
            params.push(brandFilter.trim());
        }

        if (typeFilter.trim()) {
            if (typeFilter === "alcoholic") {
                conditions.push("(p.alcohol_percentage > 0 OR p.is_age_restricted = 1)");
            } else if (typeFilter === "non-alcoholic") {
                conditions.push("(p.alcohol_percentage = 0 OR p.alcohol_percentage IS NULL OR p.is_age_restricted = 0)");
            }
        }

        let products = [];
        let totalProducts = 0;
        let totalPages = 0;
        let brands = [];

        if (!isInvalidCategory) {
            // Count total matching products for pagination
            let countQuery = "SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id";
            if (conditions.length > 0) {
                countQuery += " WHERE " + conditions.join(" AND ");
            }
            const [countResult] = await pool.query(countQuery, params);
            totalProducts = countResult[0].total;
            totalPages = Math.ceil(totalProducts / limit);

            // Fetch paginated products
            let query = `
                SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN brands b ON p.brand_id = b.id
            `;
            if (conditions.length > 0) {
                query += " WHERE " + conditions.join(" AND ");
            }

            // Apply sorting
            if (sort === "latest") {
                query += " ORDER BY p.created_at DESC";
            } else if (sort === "low") {
                query += " ORDER BY p.price ASC";
            } else if (sort === "high") {
                query += " ORDER BY p.price DESC";
            } else {
                query += " ORDER BY p.is_featured DESC, p.created_at DESC";
            }

            query += " LIMIT ? OFFSET ?";
            const queryParams = [...params, limit, offset];
            const [productRows] = await pool.query(query, queryParams);
            products = productRows;

            // Fetch active brands that have products in this category (or any approved products if no category filter is set)
            if (categoryFilter.trim()) {
                const [brandRows] = await pool.query(
                    `SELECT DISTINCT b.id, b.name, b.slug, b.logo 
                     FROM brands b 
                     JOIN products p ON p.brand_id = b.id 
                     JOIN categories c ON p.category_id = c.id 
                     WHERE c.slug = ? AND b.status = 'active' AND p.status = 'approved'`,
                    [categoryFilter.trim()]
                );
                brands = brandRows;
            } else {
                const [brandRows] = await pool.query(
                    `SELECT DISTINCT b.id, b.name, b.slug, b.logo 
                     FROM brands b 
                     JOIN products p ON p.brand_id = b.id 
                     WHERE b.status = 'active' AND p.status = 'approved'`
                );
                brands = brandRows;
            }
        }

        // Fetch active categories for the filter pills
        const [categories] = await pool.query("SELECT * FROM categories WHERE status = 'active'");

        res.render("user/products", {
            title: selectedCategory ? `${selectedCategory.name} - Drinkit` : "Shop - Drinkit",
            products,
            categories,
            brands,
            searchQuery,
            categoryFilter,
            brandFilter,
            typeFilter,
            sort,
            currentPage: page,
            totalPages,
            totalProducts,
            isInvalidCategory,
            selectedCategory
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

router.get("/cart", ensureAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        // 1. Get cart items joining products
        const [cartItems] = await pool.query(
            `SELECT ci.id as cart_item_id, ci.quantity, ci.price as cart_item_price, 
                    p.id as product_id, p.name, p.slug, p.image, p.bottle_size, p.price as product_price, p.sale_price
             FROM carts c
             JOIN cart_items ci ON c.id = ci.cart_id
             JOIN products p ON ci.product_id = p.id
             WHERE c.user_id = ?`,
            [userId]
        );

        // Calculate totals
        let subtotal = 0;
        cartItems.forEach(item => {
            subtotal += item.quantity * item.cart_item_price;
        });

        const deliveryFee = subtotal > 500 || subtotal === 0 ? 0 : 49;
        const discount = 0;
        const total = subtotal + deliveryFee - discount;

        res.render("user/cart", {
            title: "My Cart - Drinkit",
            user: req.session.user,
            cartItems,
            subtotal,
            deliveryFee,
            discount,
            total
        });
    } catch (error) {
        console.error("❌ Error fetching cart details:", error);
        next(error);
    }
});


// ==========================================================
// SINGLE PRODUCT DETAILS
// ==========================================================

router.get("/product/:slug", async (req, res, next) => {
    const { slug } = req.params;
    try {
        // 1. Fetch main product details
        const [products] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             LEFT JOIN brands b ON p.brand_id = b.id 
             WHERE p.slug = ? AND p.status = 'approved' LIMIT 1`,
            [slug]
        );

        if (products.length === 0) {
            // Fetch active categories for error/not found state compatibility
            const [categories] = await pool.query("SELECT * FROM categories WHERE status = 'active'");
            return res.status(404).render("user/products", {
                title: "Product Not Found - Drinkit",
                products: [],
                categories,
                brands: [],
                searchQuery: "",
                categoryFilter: "",
                brandFilter: "",
                typeFilter: "",
                sort: "popular",
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0,
                isInvalidCategory: false,
                selectedCategory: null
            });
        }

        const product = products[0];

        // 2. Fetch related products in the same category (excluding current)
        const [relatedProducts] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.category_id = ? AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.category_id, product.id]
        );

        // 3. Fetch snacks (excluding current)
        const [snacks] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'snacks' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        // 4. Fetch soft drinks (excluding current)
        const [softDrinks] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'soft-drinks' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        // 5. Fetch spirits (excluding current)
        const [spirits] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'spirits' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        res.render("user/product-details", {
            title: `${product.name} - Drinkit`,
            product,
            relatedProducts,
            snacks,
            snacksProducts: snacks,
            softDrinks,
            softDrinkProducts: softDrinks,
            spirits,
            spiritsProducts: spirits
        });
    } catch (error) {
        console.error("❌ Error fetching product details:", error);
        next(error);
    }
});


// ==========================================================
// ADD TO CART (AJAX Endpoint)
// ==========================================================

router.post("/cart/add", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Please login to add items to cart." });
    }

    const { productId, quantity } = req.body;
    const userId = req.session.user.id;
    const qty = Number(quantity) || 1;

    if (!productId) {
        return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    try {
        // 1. Get product price
        const [products] = await pool.query("SELECT price FROM products WHERE id = ? LIMIT 1", [productId]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        const price = products[0].price;

        // 2. Manage carts and cart_items
        let cartId;
        const [carts] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
        if (carts.length === 0) {
            const [result] = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
            cartId = result.insertId;
        } else {
            cartId = carts[0].id;
        }

        const [items] = await pool.query("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1", [cartId, productId]);
        if (items.length > 0) {
            await pool.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [qty, items[0].id]);
        } else {
            await pool.query("INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", [cartId, productId, qty, price]);
        }

        // 3. Fallback flat cart sync
        try {
            const [flatItems] = await pool.query("SELECT quantity FROM cart WHERE user_id = ? AND product_id = ? LIMIT 1", [userId, productId]);
            if (flatItems.length > 0) {
                await pool.query("UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?", [qty, userId, productId]);
            } else {
                await pool.query("INSERT INTO cart (cart_id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)", [cartId, userId, productId, qty]);
            }
        } catch (flatErr) {
            console.error("Flat cart table fallback sync error:", flatErr.message);
        }

        // 4. Calculate total cart count
        const [countRows] = await pool.query(
            `SELECT SUM(ci.quantity) as count 
             FROM carts c 
             JOIN cart_items ci ON c.id = ci.cart_id 
             WHERE c.user_id = ?`,
            [userId]
        );
        const cartCount = countRows[0].count || 0;

        return res.json({ success: true, message: "Item added to cart successfully.", cartCount: Number(cartCount) });
    } catch (err) {
        console.error("Error adding to cart:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});


// ==========================================================
// UPDATE CART ITEM (AJAX Endpoint)
// ==========================================================

router.post("/cart/update", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { itemId, quantity } = req.body;
    const userId = req.session.user.id;
    const qty = parseInt(quantity);

    if (!itemId || isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    try {
        // Verify cart item belongs to user
        const [rows] = await pool.query(
            `SELECT ci.id, ci.product_id, c.id as cart_id 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id 
             WHERE ci.id = ? AND c.user_id = ? LIMIT 1`,
            [itemId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found." });
        }

        const productId = rows[0].product_id;
        const cartId = rows[0].cart_id;

        // Update quantity in cart_items
        await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [qty, itemId]);

        // Sync with fallback flat cart table if it exists
        try {
            await pool.query("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", [qty, userId, productId]);
        } catch (flatErr) {
            console.error("Flat cart sync update error:", flatErr.message);
        }

        // Fetch updated totals
        const [items] = await pool.query(
            `SELECT ci.quantity, ci.price FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?`,
            [userId]
        );
        let subtotal = 0;
        let cartCount = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.price;
            cartCount += item.quantity;
        });

        const deliveryFee = subtotal > 500 ? 0 : 49;
        const total = subtotal + deliveryFee;

        return res.json({
            success: true,
            subtotal,
            deliveryFee,
            total,
            cartCount
        });
    } catch (err) {
        console.error("Error updating cart:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// ==========================================================
// REMOVE CART ITEM (AJAX Endpoint)
// ==========================================================

router.post("/cart/remove", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { itemId } = req.body;
    const userId = req.session.user.id;

    if (!itemId) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    try {
        // Verify cart item belongs to user
        const [rows] = await pool.query(
            `SELECT ci.id, ci.product_id 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id 
             WHERE ci.id = ? AND c.user_id = ? LIMIT 1`,
            [itemId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found." });
        }

        const productId = rows[0].product_id;

        // Delete from cart_items
        await pool.query("DELETE FROM cart_items WHERE id = ?", [itemId]);

        // Sync with flat cart table
        try {
            await pool.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId]);
        } catch (flatErr) {
            console.error("Flat cart sync delete error:", flatErr.message);
        }

        // Fetch updated totals
        const [items] = await pool.query(
            `SELECT ci.quantity, ci.price FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?`,
            [userId]
        );
        let subtotal = 0;
        let cartCount = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.price;
            cartCount += item.quantity;
        });

        const deliveryFee = subtotal > 500 || items.length === 0 ? 0 : 49;
        const total = subtotal + deliveryFee;

        return res.json({
            success: true,
            subtotal,
            deliveryFee,
            total,
            cartCount,
            isEmpty: items.length === 0
        });
    } catch (err) {
        console.error("Error removing item from cart:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;