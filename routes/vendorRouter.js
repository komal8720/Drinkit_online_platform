// ==========================================================
// DRINKIT - VENDOR ROUTER
// Production-Ready Vendor Portal Implementation
// Complete zero-mock data, IDOR protection, vendor scoping
// ==========================================================

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { pool } = require("../config/db");
const ROLES = require("../config/roles");
const { requireVendor } = require("../middleware/role");
const upload = require("../middleware/upload");
const { authLimiter, activationLimiter } = require("../middleware/rateLimiter");
const { logAudit } = require("../services/audit.service");
const { createNotification, markAsRead, markAllAsRead } = require("../services/notification.service");

const router = express.Router();

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-");
};

// ==========================================================
// PUBLIC VENDOR AUTHENTICATION ROUTES
// ==========================================================

// 1. Vendor Login Page (GET)
router.get("/login", (req, res) => {
    if (req.session && req.session.user && Number(req.session.user.role_id) === ROLES.VENDOR) {
        return res.redirect("/vendor/dashboard");
    }
    res.render("vendor/login", {
        title: "Vendor Portal Sign In",
        success_msg: req.flash("success")[0] || null,
        error_msg: req.flash("error")[0] || null,
        identifier: ""
    });
});

// 2. Vendor Login Handler (POST)
router.post("/login", authLimiter, async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        req.flash("error", "Username/Email and password are required.");
        return res.render("vendor/login", {
            title: "Vendor Portal Sign In",
            success_msg: null,
            error_msg: "Username/Email and password are required.",
            identifier: identifier || ""
        });
    }

    try {
        const cleanId = identifier.trim().toLowerCase();

        // 1. Query user by username or email strictly scoped to VENDOR role
        const [users] = await pool.query(`
            SELECT id, role_id, username, first_name, last_name, email, mobile, password_hash, status
            FROM users
            WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND role_id = ?
        `, [cleanId, cleanId, ROLES.VENDOR]);

        if (!users.length) {
            return res.render("vendor/login", {
                title: "Vendor Portal Sign In",
                success_msg: null,
                error_msg: "Invalid login credentials for vendor portal.",
                identifier: cleanId
            });
        }

        const user = users[0];

        // 2. Verify password with bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.render("vendor/login", {
                title: "Vendor Portal Sign In",
                success_msg: null,
                error_msg: "Invalid login credentials for vendor portal.",
                identifier: cleanId
            });
        }

        // 3. Check account status
        if (user.status !== "active") {
            return res.render("vendor/login", {
                title: "Vendor Portal Sign In",
                success_msg: null,
                error_msg: "Your vendor account is not active. Please check activation link or contact support.",
                identifier: cleanId
            });
        }

        // 4. Check associated vendor store record
        const [vendors] = await pool.query("SELECT * FROM vendors WHERE user_id = ?", [user.id]);
        if (!vendors.length) {
            return res.render("vendor/login", {
                title: "Vendor Portal Sign In",
                success_msg: null,
                error_msg: "No beverage vendor store found associated with this user account.",
                identifier: cleanId
            });
        }

        const vendor = vendors[0];
        if (vendor.status === "suspended" || vendor.verification_status === "suspended" || vendor.verification_status === "rejected") {
            return res.render("vendor/login", {
                title: "Vendor Portal Sign In",
                success_msg: null,
                error_msg: "Your vendor store has been suspended or rejected. Please contact Drinkit management.",
                identifier: cleanId
            });
        }

        // 5. Update last login
        await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

        // 6. Establish secure server session
        req.session.user = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            name: `${user.first_name} ${user.last_name || ""}`.trim(),
            email: user.email,
            username: user.username,
            role_id: user.role_id,
            status: user.status
        };

        // 7. Audit log
        await logAudit({
            userId: user.id,
            action: "VENDOR_LOGIN",
            module: "VENDOR_PORTAL",
            description: `Vendor user '${user.username}' logged into vendor portal (Store: ${vendor.business_name})`,
            req
        });

        return res.redirect("/vendor/dashboard");
    } catch (error) {
        console.error("❌ Vendor login error:", error);
        return res.render("vendor/login", {
            title: "Vendor Portal Sign In",
            success_msg: null,
            error_msg: "Internal authentication error. Please try again.",
            identifier: identifier || ""
        });
    }
});

// 3. Vendor Activation View (GET)
router.get("/activate/:token", async (req, res) => {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length < 32) {
        req.flash("error", "Invalid or malformed activation token.");
        return res.redirect("/vendor/login");
    }

    try {
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

        const [records] = await pool.query(`
            SELECT vat.id as token_id, vat.expires_at, vat.used_at,
                   v.id as vendor_id, v.business_name, v.owner_name,
                   u.id as user_id, u.username, u.email
            FROM vendor_activation_tokens vat
            JOIN vendors v ON vat.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            WHERE vat.token_hash = ?
        `, [tokenHash]);

        if (!records.length) {
            req.flash("error", "Activation invitation not found. Please contact administrator.");
            return res.redirect("/vendor/login");
        }

        const record = records[0];

        if (record.used_at) {
            req.flash("error", "This activation invitation has already been used. Please log in.");
            return res.redirect("/vendor/login");
        }

        if (new Date(record.expires_at) < new Date()) {
            req.flash("error", "This activation invitation link has expired. Please request a new invitation from administrator.");
            return res.redirect("/vendor/login");
        }

        res.render("vendor/activate", {
            title: "Activate Store & Setup Password",
            vendor: {
                business_name: record.business_name,
                owner_name: record.owner_name
            },
            user: {
                username: record.username,
                email: record.email
            },
            token: rawToken,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Activation token lookup error:", error);
        req.flash("error", "Error checking activation status.");
        return res.redirect("/vendor/login");
    }
});

// 4. Vendor Password Setup & Activation Submission (POST)
router.post("/activate/:token", activationLimiter, async (req, res) => {
    const rawToken = req.params.token;
    const { password, confirm_password } = req.body;

    if (!password || password.length < 8) {
        req.flash("error", "Password must be at least 8 characters long.");
        return res.redirect(`/vendor/activate/${rawToken}`);
    }

    if (password !== confirm_password) {
        req.flash("error", "Password and confirmation do not match.");
        return res.redirect(`/vendor/activate/${rawToken}`);
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [records] = await connection.query(`
            SELECT vat.id as token_id, vat.expires_at, vat.used_at,
                   v.id as vendor_id, v.business_name,
                   u.id as user_id, u.username, u.email
            FROM vendor_activation_tokens vat
            JOIN vendors v ON vat.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            WHERE vat.token_hash = ?
            FOR UPDATE
        `, [tokenHash]);

        if (!records.length || records[0].used_at || new Date(records[0].expires_at) < new Date()) {
            await connection.rollback();
            req.flash("error", "Activation invitation is invalid, used, or expired.");
            return res.redirect("/vendor/login");
        }

        const record = records[0];
        const passwordHash = await bcrypt.hash(password, 10);

        // Update user
        await connection.query(`
            UPDATE users
            SET password_hash = ?, status = 'active', email_verified_at = NOW()
            WHERE id = ?
        `, [passwordHash, record.user_id]);

        // Update vendor
        await connection.query(`
            UPDATE vendors
            SET status = 'active'
            WHERE id = ?
        `, [record.vendor_id]);

        // Mark token as used
        await connection.query(`
            UPDATE vendor_activation_tokens
            SET used_at = NOW()
            WHERE id = ?
        `, [record.token_id]);

        // Log audit
        await logAudit({
            userId: record.user_id,
            action: "VENDOR_ACTIVATED",
            module: "VENDOR_PORTAL",
            description: `Vendor store '${record.business_name}' activated and password configured by user '${record.username}'`,
            req,
            connection
        });

        await connection.commit();

        // Welcome notification
        try {
            await createNotification({
                userId: record.user_id,
                title: "Welcome to Drinkit Vendor Portal!",
                message: "Your store is now active. You can start adding products and managing inventory.",
                type: "success",
                link: "/vendor/dashboard"
            });
        } catch (notifErr) {
            console.warn("⚠️ Welcome notification warning:", notifErr.message);
        }

        req.flash("success", "Your vendor store has been activated successfully! Please sign in with your new credentials.");
        return res.redirect("/vendor/login");
    } catch (err) {
        await connection.rollback();
        console.error("❌ Vendor activation error:", err);
        req.flash("error", "Failed to activate account. Please try again.");
        return res.redirect(`/vendor/activate/${rawToken}`);
    } finally {
        connection.release();
    }
});

// 5. Vendor Logout
router.get("/logout", async (req, res) => {
    if (req.session && req.session.user) {
        await logAudit({
            userId: req.session.user.id,
            action: "VENDOR_LOGOUT",
            module: "VENDOR_PORTAL",
            description: `Vendor user '${req.session.user.username}' logged out`,
            req
        });
    }
    req.session.destroy(() => {
        res.redirect("/vendor/login");
    });
});

// ==========================================================
// PROTECTED VENDOR PORTAL ROUTES
// Guarded by requireVendor (enforces role_id = 2, attaches req.vendor & req.user)
// ==========================================================

router.use(requireVendor);

// Middleware to inject unread notification count
router.use(async (req, res, next) => {
    try {
        const [notifRes] = await pool.query(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [req.user.id]
        );
        res.locals.unreadCount = notifRes[0].count || 0;
    } catch (e) {
        res.locals.unreadCount = 0;
    }
    next();
});

// 6. Vendor Dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const vendorId = req.vendor.id;

        // 1. Total & active products count
        const [productCounts] = await pool.query(`
            SELECT
                COUNT(*) as totalProducts,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as activeProducts
            FROM products
            WHERE vendor_id = ?
        `, [vendorId]);

        // 2. Order counts (pending & completed)
        const [orderCounts] = await pool.query(`
            SELECT
                COUNT(DISTINCT CASE WHEN o.order_status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup') THEN oi.order_id END) as pendingOrders,
                COUNT(DISTINCT CASE WHEN o.order_status = 'delivered' THEN oi.order_id END) as completedOrders
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ?
        `, [vendorId]);

        // 3. Gross revenue & Net calculation (ZERO MOCK: computed from real order_items)
        const [revenueRes] = await pool.query(`
            SELECT COALESCE(SUM(oi.total_price), 0) as grossRevenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ? AND o.order_status != 'cancelled'
        `, [vendorId]);

        const grossRev = parseFloat(revenueRes[0].grossRevenue) || 0;
        const commRate = parseFloat(req.vendor.commission_rate) || 10.0;
        const netRev = grossRev - (grossRev * (commRate / 100));

        // 4. Low stock inventory alert items (stock <= 5)
        const [lowStock] = await pool.query(`
            SELECT id, name, sku, stock_quantity, price, image
            FROM products
            WHERE vendor_id = ? AND stock_quantity <= 5 AND status != 'inactive'
            ORDER BY stock_quantity ASC
            LIMIT 5
        `, [vendorId]);

        // 5. Recent 5 orders for this vendor
        const [recentOrders] = await pool.query(`
            SELECT
                o.id as order_id,
                o.order_number,
                o.created_at,
                o.order_status,
                COUNT(oi.id) as item_count,
                SUM(oi.total_price) as vendor_order_total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE oi.vendor_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [vendorId]);

        res.render("vendor/dashboard", {
            title: "Vendor Dashboard - " + req.vendor.business_name,
            currentPage: "dashboard",
            stats: {
                totalProducts: productCounts[0].totalProducts,
                activeProducts: productCounts[0].activeProducts,
                pendingOrders: orderCounts[0].pendingOrders,
                completedOrders: orderCounts[0].completedOrders,
                grossRevenue: grossRev,
                netRevenue: netRev
            },
            lowStockProducts: lowStock,
            recentOrders,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Vendor dashboard error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 7. Vendor Products List
router.get("/products", async (req, res) => {
    try {
        const vendorId = req.vendor.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : "";
        const statusFilter = req.query.status || "all";

        let whereClauses = ["p.vendor_id = ?"];
        let params = [vendorId];

        if (search) {
            whereClauses.push("(p.name LIKE ? OR p.sku LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        if (statusFilter !== "all") {
            whereClauses.push("p.status = ?");
            params.push(statusFilter);
        }

        const whereSql = "WHERE " + whereClauses.join(" AND ");

        // Total count
        const [countRes] = await pool.query(`
            SELECT COUNT(*) as total
            FROM products p
            ${whereSql}
        `, params);
        const totalProducts = countRes[0].total;
        const totalPages = Math.ceil(totalProducts / limit);

        // Products list
        const [products] = await pool.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereSql}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.render("vendor/products", {
            title: "My Products - " + req.vendor.business_name,
            currentPage: "products",
            products,
            totalProducts,
            totalPages,
            currentPageNum: page,
            search,
            statusFilter,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error listing vendor products:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 8. Add Product View (GET)
router.get("/products/add", async (req, res) => {
    try {
        const [categories] = await pool.query("SELECT id, name FROM categories WHERE status = 'active' ORDER BY name");
        res.render("vendor/product-add", {
            title: "Add New Beverage",
            currentPage: "product-add",
            categories,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error loading add product form:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 9. Add Product Handler (POST)
router.post("/products/add", upload.single("image"), async (req, res) => {
    const {
        name,
        category_id,
        sku,
        description,
        bottle_size,
        alcohol_percentage,
        price,
        sale_price,
        stock_quantity,
        min_order_quantity,
        max_order_quantity,
        is_age_restricted,
        is_featured
    } = req.body;

    const vendorId = req.vendor.id;

    if (!name || !name.trim()) {
        req.flash("error", "Product name is required.");
        return res.redirect("/vendor/products/add");
    }

    if (!category_id) {
        req.flash("error", "Category is required.");
        return res.redirect("/vendor/products/add");
    }

    const regPrice = parseFloat(price);
    if (isNaN(regPrice) || regPrice <= 0) {
        req.flash("error", "Valid regular price is required.");
        return res.redirect("/vendor/products/add");
    }

    try {
        const slug = slugify(name) + "-" + Date.now();
        const productSku = sku && sku.trim() ? sku.trim() : `SKU-V${vendorId}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
        const initialStatus = "approved"; // Default to approved for verified vendors

        await pool.query(`
            INSERT INTO products (
                vendor_id, category_id, name, slug, sku, description,
                bottle_size, alcohol_percentage, price, sale_price,
                stock_quantity, min_order_quantity, max_order_quantity,
                image, status, is_featured, is_age_restricted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vendorId,
            category_id,
            name.trim(),
            slug,
            productSku,
            description ? description.trim() : null,
            bottle_size ? bottle_size.trim() : null,
            alcohol_percentage ? parseFloat(alcohol_percentage) : null,
            regPrice,
            sale_price ? parseFloat(sale_price) : null,
            parseInt(stock_quantity) || 0,
            parseInt(min_order_quantity) || 1,
            parseInt(max_order_quantity) || 10,
            imagePath,
            initialStatus,
            is_featured ? 1 : 0,
            is_age_restricted ? 1 : 0
        ]);

        await logAudit({
            userId: req.user.id,
            action: "PRODUCT_CREATED",
            module: "CATALOG",
            description: `Vendor added new product '${name.trim()}' (SKU: ${productSku})`,
            req
        });

        req.flash("success", `Product '${name.trim()}' added to catalog successfully.`);
        res.redirect("/vendor/products");
    } catch (error) {
        console.error("❌ Error adding vendor product:", error);
        req.flash("error", "Failed to add product: " + error.message);
        res.redirect("/vendor/products/add");
    }
});

// 10. Edit Product View (GET with strict ownership verification)
router.get("/products/edit/:id", async (req, res) => {
    try {
        const [products] = await pool.query(
            "SELECT * FROM products WHERE id = ? AND vendor_id = ?",
            [req.params.id, req.vendor.id]
        );

        if (!products.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. You do not own this product record."
            });
        }

        const [categories] = await pool.query("SELECT id, name FROM categories WHERE status = 'active' ORDER BY name");

        res.render("vendor/product-edit", {
            title: `Edit ${products[0].name}`,
            currentPage: "products",
            product: products[0],
            categories,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error fetching product for edit:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 11. Edit Product Handler (POST with strict ownership verification)
router.post("/products/edit/:id", upload.single("image"), async (req, res) => {
    const {
        name,
        category_id,
        sku,
        description,
        bottle_size,
        alcohol_percentage,
        price,
        sale_price,
        stock_quantity,
        min_order_quantity,
        max_order_quantity,
        is_age_restricted,
        is_featured
    } = req.body;

    try {
        const [products] = await pool.query(
            "SELECT * FROM products WHERE id = ? AND vendor_id = ?",
            [req.params.id, req.vendor.id]
        );

        if (!products.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. You do not own this product record."
            });
        }

        const existingProduct = products[0];
        const imagePath = req.file ? `/uploads/${req.file.filename}` : existingProduct.image;

        await pool.query(`
            UPDATE products
            SET name = ?, category_id = ?, sku = ?, description = ?, bottle_size = ?,
                alcohol_percentage = ?, price = ?, sale_price = ?, stock_quantity = ?,
                min_order_quantity = ?, max_order_quantity = ?, image = ?,
                is_featured = ?, is_age_restricted = ?
            WHERE id = ? AND vendor_id = ?
        `, [
            name.trim(),
            category_id,
            sku.trim(),
            description ? description.trim() : null,
            bottle_size ? bottle_size.trim() : null,
            alcohol_percentage ? parseFloat(alcohol_percentage) : null,
            parseFloat(price),
            sale_price ? parseFloat(sale_price) : null,
            parseInt(stock_quantity) || 0,
            parseInt(min_order_quantity) || 1,
            parseInt(max_order_quantity) || 10,
            imagePath,
            is_featured ? 1 : 0,
            is_age_restricted ? 1 : 0,
            existingProduct.id,
            req.vendor.id
        ]);

        await logAudit({
            userId: req.user.id,
            action: "PRODUCT_UPDATED",
            module: "CATALOG",
            description: `Vendor updated product '${name.trim()}' (ID: ${existingProduct.id})`,
            req
        });

        req.flash("success", `Product '${name.trim()}' updated successfully.`);
        res.redirect("/vendor/products");
    } catch (error) {
        console.error("❌ Error updating product:", error);
        req.flash("error", "Failed to update product.");
        res.redirect(`/vendor/products/edit/${req.params.id}`);
    }
});

// 12. Toggle Product Active Status
router.post("/products/toggle-status/:id", async (req, res) => {
    try {
        const [products] = await pool.query(
            "SELECT id, name, status FROM products WHERE id = ? AND vendor_id = ?",
            [req.params.id, req.vendor.id]
        );

        if (!products.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. You do not own this product record."
            });
        }

        const newStatus = products[0].status === "approved" ? "inactive" : "approved";
        await pool.query("UPDATE products SET status = ? WHERE id = ?", [newStatus, products[0].id]);

        await logAudit({
            userId: req.user.id,
            action: "PRODUCT_STATUS_TOGGLED",
            module: "CATALOG",
            description: `Vendor changed status of '${products[0].name}' to '${newStatus}'`,
            req
        });

        req.flash("success", `Product '${products[0].name}' is now ${newStatus}.`);
        res.redirect("/vendor/products");
    } catch (error) {
        console.error("❌ Error toggling product status:", error);
        res.status(500).send("Server Error");
    }
});

// 13. Delete Product (ownership checked)
router.post("/products/delete/:id", async (req, res) => {
    try {
        const [products] = await pool.query(
            "SELECT id, name FROM products WHERE id = ? AND vendor_id = ?",
            [req.params.id, req.vendor.id]
        );

        if (!products.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. You do not own this product record."
            });
        }

        await pool.query("DELETE FROM products WHERE id = ? AND vendor_id = ?", [req.params.id, req.vendor.id]);

        await logAudit({
            userId: req.user.id,
            action: "PRODUCT_DELETED",
            module: "CATALOG",
            description: `Vendor deleted product '${products[0].name}' (ID: ${req.params.id})`,
            req
        });

        req.flash("success", `Product '${products[0].name}' deleted successfully.`);
        res.redirect("/vendor/products");
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        req.flash("error", "Could not delete product (it may be linked to active order history).");
        res.redirect("/vendor/products");
    }
});

// 14. Vendor Orders List (strictly scoped to orders containing vendor items)
router.get("/orders", async (req, res) => {
    try {
        const vendorId = req.vendor.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : "";
        const statusFilter = req.query.status || "all";

        let whereClauses = ["oi.vendor_id = ?"];
        let params = [vendorId];

        if (search) {
            whereClauses.push("o.order_number LIKE ?");
            params.push(`%${search}%`);
        }

        if (statusFilter !== "all") {
            whereClauses.push("o.order_status = ?");
            params.push(statusFilter);
        }

        const whereSql = "WHERE " + whereClauses.join(" AND ");

        // Total count
        const [countRes] = await pool.query(`
            SELECT COUNT(DISTINCT o.id) as total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            ${whereSql}
        `, params);
        const totalOrders = countRes[0].total;
        const totalPages = Math.ceil(totalOrders / limit);

        // Orders list
        const [orders] = await pool.query(`
            SELECT o.id, o.order_number, o.created_at, o.payment_status, o.order_status,
                   CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as customer_name,
                   u.mobile as customer_mobile,
                   COUNT(oi.id) as item_count,
                   SUM(oi.total_price) as vendor_total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN users u ON o.customer_id = u.id
            ${whereSql}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.render("vendor/orders", {
            title: "Store Orders - " + req.vendor.business_name,
            currentPage: "orders",
            orders,
            totalOrders,
            totalPages,
            currentPageNum: page,
            search,
            statusFilter,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error listing vendor orders:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 15. Order Details (strictly scoped to vendor's items with IDOR protection)
router.get("/orders/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const vendorId = req.vendor.id;

        // Verify vendor has items in this order
        const [orderItems] = await pool.query(`
            SELECT oi.*, p.image, p.bottle_size
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ? AND oi.vendor_id = ?
        `, [orderId, vendorId]);

        if (!orderItems.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. This order does not contain items from your store."
            });
        }

        // Fetch order details
        const [orders] = await pool.query(`
            SELECT o.*,
                   CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as customer_name,
                   u.mobile as customer_mobile,
                   CONCAT(COALESCE(a.address_line1, ''), ', ', COALESCE(a.city, ''), ', ', COALESCE(a.state, ''), ' - ', COALESCE(a.pincode, '')) as delivery_address
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            LEFT JOIN addresses a ON o.address_id = a.id
            WHERE o.id = ?
        `, [orderId]);

        if (!orders.length) {
            req.flash("error", "Order not found.");
            return res.redirect("/vendor/orders");
        }

        res.render("vendor/order-detail", {
            title: `Order #${orders[0].order_number}`,
            currentPage: "orders",
            order: orders[0],
            orderItems,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error fetching vendor order detail:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 16. Update Order Status (Vendor fulfillment transition)
router.post("/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const vendorId = req.vendor.id;

    // Allowed statuses vendor can transition to
    const allowed = ["confirmed", "preparing", "ready_for_pickup"];
    if (!allowed.includes(status)) {
        req.flash("error", "Invalid order status transition.");
        return res.redirect(`/vendor/orders/${orderId}`);
    }

    try {
        // Ownership check
        const [items] = await pool.query(
            "SELECT id FROM order_items WHERE order_id = ? AND vendor_id = ?",
            [orderId, vendorId]
        );

        if (!items.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. This order does not contain items from your store."
            });
        }

        await pool.query("UPDATE orders SET order_status = ? WHERE id = ?", [status, orderId]);

        // Customer notification
        const [orders] = await pool.query("SELECT customer_id, order_number FROM orders WHERE id = ?", [orderId]);
        if (orders.length) {
            await createNotification({
                userId: orders[0].customer_id,
                title: `Order #${orders[0].order_number} Update`,
                message: `Your order status has been updated to '${status}' by the beverage vendor.`,
                type: "info",
                link: `/orders/${orderId}`
            });
        }

        await logAudit({
            userId: req.user.id,
            action: "ORDER_STATUS_UPDATED",
            module: "ORDERS",
            description: `Vendor updated order #${orders[0].order_number} status to '${status}'`,
            req
        });

        req.flash("success", `Order status updated to '${status}'.`);
        res.redirect(`/vendor/orders/${orderId}`);
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        req.flash("error", "Failed to update order status.");
        res.redirect(`/vendor/orders/${orderId}`);
    }
});

// 17. Vendor Earnings & Financial Reconciliation
router.get("/earnings", async (req, res) => {
    try {
        const vendorId = req.vendor.id;

        // Lifetime summary from order_items
        const [revRes] = await pool.query(`
            SELECT COALESCE(SUM(oi.total_price), 0) as grossRevenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ? AND o.order_status != 'cancelled'
        `, [vendorId]);

        const gross = parseFloat(revRes[0].grossRevenue) || 0;
        const commRate = parseFloat(req.vendor.commission_rate) || 10.0;
        const totalComm = gross * (commRate / 100);
        const net = gross - totalComm;

        // Payout records from commissions
        const [payouts] = await pool.query(`
            SELECT c.*, o.order_number
            FROM commissions c
            JOIN orders o ON c.order_id = o.id
            WHERE c.vendor_id = ?
            ORDER BY c.created_at DESC
        `, [vendorId]);

        const pendingPayout = payouts
            .filter(p => p.status === "pending")
            .reduce((sum, p) => sum + parseFloat(p.vendor_amount || 0), 0);

        res.render("vendor/earnings", {
            title: "Earnings & Payouts",
            currentPage: "earnings",
            summary: {
                totalGross: gross,
                totalCommission: totalComm,
                totalNet: net,
                pendingPayout: pendingPayout
            },
            payouts
        });
    } catch (error) {
        console.error("❌ Error loading vendor earnings:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 18. Vendor Sales Reports
router.get("/reports", async (req, res) => {
    try {
        const vendorId = req.vendor.id;
        const period = req.query.period || "all";
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        let dateClause = "";
        let dateParams = [];

        if (period === "today") {
            dateClause = "AND DATE(o.created_at) = CURDATE()";
        } else if (period === "yesterday") {
            dateClause = "AND DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
        } else if (period === "7d") {
            dateClause = "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if (period === "month") {
            dateClause = "AND YEAR(o.created_at) = YEAR(NOW()) AND MONTH(o.created_at) = MONTH(NOW())";
        } else if (period === "custom" && startDate && endDate) {
            dateClause = "AND DATE(o.created_at) BETWEEN ? AND ?";
            dateParams.push(startDate, endDate);
        }

        // Totals for this vendor
        const [totalRes] = await pool.query(`
            SELECT
                COUNT(DISTINCT oi.order_id) as orderCount,
                COALESCE(SUM(oi.quantity), 0) as unitsSold,
                COALESCE(SUM(oi.total_price), 0) as grossSales
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ? AND o.order_status != 'cancelled' ${dateClause}
        `, [vendorId, ...dateParams]);

        const gross = parseFloat(totalRes[0].grossSales) || 0;
        const commRate = parseFloat(req.vendor.commission_rate) || 10.0;
        const net = gross - (gross * (commRate / 100));

        // Breakdown by product
        const [productBreakdown] = await pool.query(`
            SELECT
                oi.product_name,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                COUNT(DISTINCT oi.order_id) as order_count,
                COALESCE(SUM(oi.total_price), 0) as gross_revenue,
                COALESCE(SUM(oi.total_price * (? / 100)), 0) as commission_amount,
                COALESCE(SUM(oi.total_price * (1 - (? / 100))), 0) as net_amount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ? AND o.order_status != 'cancelled' ${dateClause}
            GROUP BY oi.product_name
            ORDER BY gross_revenue DESC
        `, [commRate, commRate, vendorId, ...dateParams]);

        res.render("vendor/reports", {
            title: "Store Sales Reports",
            currentPage: "reports",
            totals: {
                orderCount: totalRes[0].orderCount,
                unitsSold: totalRes[0].unitsSold,
                grossSales: gross,
                netPayout: net
            },
            productBreakdown,
            period,
            startDate,
            endDate
        });
    } catch (error) {
        console.error("❌ Error loading vendor reports:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 19. Vendor Notifications
router.get("/notifications", async (req, res) => {
    try {
        const [notifications] = await pool.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [req.user.id]
        );

        res.render("vendor/notifications", {
            title: "Store Notifications",
            currentPage: "notifications",
            notifications,
            success_msg: req.flash("success")[0] || null
        });
    } catch (error) {
        console.error("❌ Error loading notifications:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 20. Mark Single Notification as Read
router.post("/notifications/:id/read", async (req, res) => {
    try {
        await markAsRead(req.params.id, req.user.id);
        res.redirect("/vendor/notifications");
    } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        res.redirect("/vendor/notifications");
    }
});

// 21. Mark All Notifications as Read
router.post("/notifications/read-all", async (req, res) => {
    try {
        await markAllAsRead(req.user.id);
        req.flash("success", "All notifications marked as read.");
        res.redirect("/vendor/notifications");
    } catch (error) {
        console.error("❌ Error marking all notifications as read:", error);
        res.redirect("/vendor/notifications");
    }
});

// 22. Store Profile (GET)
router.get("/profile", (req, res) => {
    res.render("vendor/profile", {
        title: "Store Profile & Settings",
        currentPage: "profile",
        success_msg: req.flash("success")[0] || null,
        error_msg: req.flash("error")[0] || null
    });
});

// 23. Update Operational Profile Details (POST)
router.post("/profile", async (req, res) => {
    const { business_mobile, address, city, state, pincode } = req.body;

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!business_mobile || !indianMobileRegex.test(business_mobile.trim())) {
        req.flash("error", "Please provide a valid 10-digit Indian mobile number.");
        return res.redirect("/vendor/profile");
    }

    const pincodeRegex = /^\d{6}$/;
    if (!pincode || !pincodeRegex.test(pincode.trim())) {
        req.flash("error", "Pincode must be exactly 6 digits.");
        return res.redirect("/vendor/profile");
    }

    try {
        await pool.query(`
            UPDATE vendors
            SET business_mobile = ?, address = ?, city = ?, state = ?, pincode = ?
            WHERE id = ?
        `, [
            business_mobile.trim(),
            address.trim(),
            city.trim(),
            state.trim(),
            pincode.trim(),
            req.vendor.id
        ]);

        // Sync mobile on users table
        await pool.query("UPDATE users SET mobile = ? WHERE id = ?", [business_mobile.trim(), req.user.id]);

        await logAudit({
            userId: req.user.id,
            action: "VENDOR_PROFILE_UPDATED",
            module: "PROFILE",
            description: `Vendor updated operational contact details (Store: ${req.vendor.business_name})`,
            req
        });

        req.flash("success", "Store operational profile updated successfully.");
        res.redirect("/vendor/profile");
    } catch (error) {
        console.error("❌ Error updating vendor profile:", error);
        req.flash("error", "Failed to update profile.");
        res.redirect("/vendor/profile");
    }
});

module.exports = router;
