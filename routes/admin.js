// ==========================================================
// DRINKIT ADMIN ROUTES
// ==========================================================

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const requireAdmin = require("../middleware/adminAuth");
const upload = require("../middleware/upload");
const ROLES = require("../config/roles");
const { logAudit } = require("../services/audit.service");
const { createNotification } = require("../services/notification.service");
const { sendVendorInvitationEmail } = require("../services/mail.service");

const router = express.Router();

// Helper to generate slug
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w\-]+/g, "") // Remove all non-word chars
        .replace(/\-\-+/g, "-"); // Replace multiple - with single -
};

// ==========================================================
// ADMIN LOGIN (GET)
// ==========================================================

router.get("/login", (req, res) => {
    if (req.session && req.session.admin) {
        return res.redirect("/admin/dashboard");
    }

    res.render("admin/login", {
        title: "Admin Login",
        csrfToken: (req.session && req.session.csrfToken) ? req.session.csrfToken : res.locals.csrfToken
    });
});

// ==========================================================
// ADMIN LOGIN (POST)
// ==========================================================

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const currentCsrf = (req.session && req.session.csrfToken) ? req.session.csrfToken : res.locals.csrfToken;

    try {
        if (!email || !password) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Please provide email and password.",
                csrfToken: currentCsrf
            });
        }

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Invalid email or password.",
                csrfToken: currentCsrf
            });
        }

        const user = users[0];

        if (Number(user.role_id) !== ROLES.SUPER_ADMIN) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Access denied. Authorized administrators only.",
                csrfToken: currentCsrf
            });
        }

        if (user.status !== "active") {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Your account is not active. Please contact support.",
                csrfToken: currentCsrf
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Invalid email or password.",
                csrfToken: currentCsrf
            });
        }

        await pool.query(
            "UPDATE users SET last_login_at = NOW() WHERE id = ?",
            [user.id]
        );

        // Session fixation protection: regenerate session upon login
        req.session.regenerate((err) => {
            if (err) {
                console.error("❌ Session regeneration error:", err);
                return res.render("admin/login", {
                    title: "Admin Login",
                    error: "Session error. Please try again.",
                    csrfToken: (req.session && req.session.csrfToken) ? req.session.csrfToken : res.locals.csrfToken
                });
            }

            // Issue a new CSRF token for the fresh session
            const newCsrfToken = crypto.randomBytes(32).toString("hex");
            req.session.csrfToken = newCsrfToken;
            res.locals.csrfToken = newCsrfToken;

            req.session.admin = {
                id: user.id,
                role_id: user.role_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                mobile: user.mobile
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("❌ Session save error:", saveErr);
                }
                return res.redirect("/admin/dashboard");
            });
        });

    } catch (error) {
        console.error("❌ Admin Login Error:", error);
        return res.render("admin/login", {
            title: "Admin Login",
            error: "Something went wrong. Please try again.",
            csrfToken: (req.session && req.session.csrfToken) ? req.session.csrfToken : res.locals.csrfToken
        });
    }
});

// ==========================================================
// ADMIN LOGOUT
// ==========================================================

router.get("/logout", (req, res) => {
    if (req.session) {
        req.session.admin = null;
    }
    res.redirect("/admin/login");
});

// ==========================================================
// ADMIN HOME (REDIRECT)
// ==========================================================

router.get("/", requireAdmin, (req, res) => {
    res.redirect("/admin/dashboard");
});

// ==========================================================
// ADMIN DASHBOARD (GET)
// ==========================================================

router.get("/dashboard", requireAdmin, async (req, res) => {
    try {
        // 1. Fetch statistics
        const [[{ totalProducts }]] = await pool.query("SELECT COUNT(*) as totalProducts FROM products");
        const [[{ totalOrders }]] = await pool.query("SELECT COUNT(*) as totalOrders FROM orders");
        const [[{ totalCustomers }]] = await pool.query("SELECT COUNT(*) as totalCustomers FROM users WHERE role_id = ?", [ROLES.CUSTOMER]);
        const [[{ totalRevenue }]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) as totalRevenue FROM orders WHERE payment_status = 'paid'");

        // 2. Fetch category overview (product count per category)
        const [categoriesOverview] = await pool.query(`
            SELECT c.name, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON p.category_id = c.id 
            GROUP BY c.id
        `);

        // 3. Fetch low stock alert products (stock_quantity < 5)
        const [lowStockProducts] = await pool.query(`
            SELECT p.name, p.stock_quantity, p.image, c.name as category_name
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.stock_quantity < 5 
            ORDER BY p.stock_quantity ASC
            LIMIT 10
        `);

        // 4. Fetch recent orders
        const [recentOrders] = await pool.query(`
            SELECT o.*, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as customer_name,
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o 
            LEFT JOIN users u ON o.customer_id = u.id 
            ORDER BY o.created_at DESC 
            LIMIT 5
        `);

        // 5. Fetch top selling products based on order_items
        const [topProducts] = await pool.query(`
            SELECT p.name, p.image, c.name as category_name, SUM(oi.quantity) as sold_count, SUM(oi.total_price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            GROUP BY p.id
            ORDER BY sold_count DESC
            LIMIT 5
        `);

        // 6. Fetch Sales Overview for chart (last 7 days of sales)
        const [salesData] = await pool.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(total_amount) as amount 
            FROM orders 
            WHERE payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.render("admin/dashboard", {
            title: "Drinkit Admin Dashboard",
            currentPage: "dashboard",
            stats: {
                totalProducts,
                totalOrders,
                totalCustomers,
                totalRevenue
            },
            categoriesOverview,
            lowStockProducts,
            recentOrders,
            topProducts,
            salesData
        });

    } catch (error) {
        console.error("❌ Error loading admin dashboard statistics:", error);
        res.render("admin/dashboard", {
            title: "Drinkit Admin Dashboard",
            currentPage: "dashboard",
            stats: { totalProducts: 0, totalOrders: 0, totalCustomers: 0, totalRevenue: 0 },
            categoriesOverview: [],
            lowStockProducts: [],
            recentOrders: [],
            topProducts: [],
            salesData: [],
            error: "Failed to load dashboard data. Please try again."
        });
    }
});

// ==========================================================
// PRODUCTS ROUTES
// ==========================================================

// List Products
router.get("/products", requireAdmin, async (req, res) => {
    try {
        const { search, category, stock, status } = req.query;
        let query = `
            SELECT p.*, c.name as category_name, b.name as brand_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += " AND p.category_id = ?";
            params.push(category);
        }

        if (stock === "low") {
            query += " AND p.stock_quantity < 5";
        } else if (stock === "out") {
            query += " AND p.stock_quantity = 0";
        }

        if (status) {
            query += " AND p.status = ?";
            params.push(status);
        }

        query += " ORDER BY p.created_at DESC";

        const [products] = await pool.query(query, params);
        const [categories] = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
        const [brands] = await pool.query("SELECT id, name FROM brands ORDER BY name ASC");

        res.render("admin/products", {
            title: "Manage Products",
            currentPage: "products",
            products,
            categories,
            brands,
            filters: { search, category, stock, status }
        });
    } catch (error) {
        console.error("❌ Error listing products:", error);
        res.status(500).send("Server Error");
    }
});

// Add Product - Form
router.get("/products/add", requireAdmin, async (req, res) => {
    try {
        const [categories] = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
        const [brands] = await pool.query("SELECT id, name FROM brands ORDER BY name ASC");
        const [vendors] = await pool.query("SELECT id, business_name FROM vendors ORDER BY business_name ASC");

        res.render("admin/products-add", {
            title: "Add New Product",
            currentPage: "products",
            categories,
            brands,
            vendors,
            error: null
        });
    } catch (error) {
        console.error("❌ Error rendering add product page:", error);
        res.status(500).send("Server Error");
    }
});

// Add Product - Action
router.post("/products/add", requireAdmin, upload.single("image"), async (req, res) => {
    const {
        name, vendor_id, category_id, brand_id, sku, description,
        bottle_size, alcohol_percentage, price, sale_price,
        stock_quantity, min_order_quantity, max_order_quantity,
        status, is_featured, is_age_restricted
    } = req.body;

    try {
        const [categories] = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
        const [brands] = await pool.query("SELECT id, name FROM brands ORDER BY name ASC");
        const [vendors] = await pool.query("SELECT id, business_name FROM vendors ORDER BY business_name ASC");

        if (!name || !vendor_id || !category_id || !price) {
            return res.render("admin/products-add", {
                title: "Add New Product",
                currentPage: "products",
                categories,
                brands,
                vendors,
                error: "Name, Vendor, Category and Price are required fields."
            });
        }

        const generatedSku = sku || "DRINK-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const generatedSlug = slugify(name) + "-" + Date.now();
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        await pool.query(
            `INSERT INTO products 
            (vendor_id, category_id, brand_id, name, slug, sku, description, bottle_size, 
             alcohol_percentage, price, sale_price, stock_quantity, min_order_quantity, 
             max_order_quantity, image, status, is_featured, is_age_restricted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vendor_id, category_id, brand_id || null, name, generatedSlug, generatedSku, description || null, bottle_size || null,
                alcohol_percentage || null, price, sale_price || null, stock_quantity || 0, min_order_quantity || 1,
                max_order_quantity || 10, imagePath, status || "pending", is_featured === "1" ? 1 : 0, is_age_restricted === "1" ? 1 : 0
            ]
        );

        res.redirect("/admin/products");
    } catch (error) {
        console.error("❌ Error adding product:", error);
        res.status(500).send("Server Error");
    }
});

// Edit Product - Form
router.get("/products/edit/:id", requireAdmin, async (req, res) => {
    try {
        const [products] = await pool.query("SELECT * FROM products WHERE id = ? LIMIT 1", [req.params.id]);
        if (products.length === 0) {
            return res.status(404).send("Product not found");
        }

        const [categories] = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
        const [brands] = await pool.query("SELECT id, name FROM brands ORDER BY name ASC");
        const [vendors] = await pool.query("SELECT id, business_name FROM vendors ORDER BY business_name ASC");

        res.render("admin/products-edit", {
            title: "Edit Product",
            currentPage: "products",
            product: products[0],
            categories,
            brands,
            vendors,
            error: null
        });
    } catch (error) {
        console.error("❌ Error rendering edit product page:", error);
        res.status(500).send("Server Error");
    }
});

// Edit Product - Action
router.post("/products/edit/:id", requireAdmin, upload.single("image"), async (req, res) => {
    const {
        name, vendor_id, category_id, brand_id, sku, description,
        bottle_size, alcohol_percentage, price, sale_price,
        stock_quantity, min_order_quantity, max_order_quantity,
        status, is_featured, is_age_restricted
    } = req.body;

    try {
        const [products] = await pool.query("SELECT * FROM products WHERE id = ? LIMIT 1", [req.params.id]);
        if (products.length === 0) {
            return res.status(404).send("Product not found");
        }
        const product = products[0];

        const [categories] = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
        const [brands] = await pool.query("SELECT id, name FROM brands ORDER BY name ASC");
        const [vendors] = await pool.query("SELECT id, business_name FROM vendors ORDER BY business_name ASC");

        if (!name || !vendor_id || !category_id || !price) {
            return res.render("admin/products-edit", {
                title: "Edit Product",
                currentPage: "products",
                product,
                categories,
                brands,
                vendors,
                error: "Name, Vendor, Category and Price are required fields."
            });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : product.image;

        await pool.query(
            `UPDATE products SET 
                vendor_id = ?, category_id = ?, brand_id = ?, name = ?, sku = ?, description = ?, 
                bottle_size = ?, alcohol_percentage = ?, price = ?, sale_price = ?, stock_quantity = ?, 
                min_order_quantity = ?, max_order_quantity = ?, image = ?, status = ?, 
                is_featured = ?, is_age_restricted = ?
            WHERE id = ?`,
            [
                vendor_id, category_id, brand_id || null, name, sku, description || null,
                bottle_size || null, alcohol_percentage || null, price, sale_price || null, stock_quantity || 0,
                min_order_quantity || 1, max_order_quantity || 10, imagePath, status,
                is_featured === "1" ? 1 : 0, is_age_restricted === "1" ? 1 : 0,
                req.params.id
            ]
        );

        res.redirect("/admin/products");
    } catch (error) {
        console.error("❌ Error updating product:", error);
        res.status(500).send("Server Error");
    }
});

// Delete Product
router.get("/products/delete/:id", requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
        res.redirect("/admin/products");
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        res.status(500).send("Server Error");
    }
});

// ==========================================================
// CATEGORIES ROUTES
// ==========================================================

// List Categories
router.get("/categories", requireAdmin, async (req, res) => {
    try {
        const [categories] = await pool.query(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `);

        res.render("admin/categories", {
            title: "Manage Categories",
            currentPage: "categories",
            categories
        });
    } catch (error) {
        console.error("❌ Error listing categories:", error);
        res.status(500).send("Server Error");
    }
});

// Add Category
router.post("/categories/add", requireAdmin, upload.single("image"), async (req, res) => {
    const { name, description, status } = req.body;
    try {
        if (!name) {
            return res.status(400).send("Category name is required");
        }
        const generatedSlug = slugify(name);
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        await pool.query(
            "INSERT INTO categories (name, slug, description, image, status) VALUES (?, ?, ?, ?, ?)",
            [name, generatedSlug, description || null, imagePath, status || "active"]
        );

        res.redirect("/admin/categories");
    } catch (error) {
        console.error("❌ Error adding category:", error);
        res.status(500).send("Server Error");
    }
});

// Edit Category
router.post("/categories/edit/:id", requireAdmin, upload.single("image"), async (req, res) => {
    const { name, description, status } = req.body;
    try {
        const [categories] = await pool.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [req.params.id]);
        if (categories.length === 0) {
            return res.status(404).send("Category not found");
        }
        const category = categories[0];

        const imagePath = req.file ? `/uploads/${req.file.filename}` : category.image;

        await pool.query(
            "UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, status = ? WHERE id = ?",
            [name, slugify(name), description || null, imagePath, status || "active", req.params.id]
        );

        res.redirect("/admin/categories");
    } catch (error) {
        console.error("❌ Error updating category:", error);
        res.status(500).send("Server Error");
    }
});

// Delete Category
router.get("/categories/delete/:id", requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("❌ Error deleting category:", error);
        res.status(500).send("Server Error");
    }
});

// ==========================================================
// ORDERS ROUTES
// ==========================================================

// List Orders
router.get("/orders", requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT o.*, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as customer_name
            FROM orders o
            LEFT JOIN users u ON o.customer_id = u.id
        `;
        const params = [];

        if (status) {
            query += " WHERE o.order_status = ?";
            params.push(status);
        }

        query += " ORDER BY o.created_at DESC";

        const [orders] = await pool.query(query, params);

        // Fetch Order Stats
        const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM orders");
        const [[{ pending }]] = await pool.query("SELECT COUNT(*) as pending FROM orders WHERE order_status = 'pending'");
        const [[{ processing }]] = await pool.query("SELECT COUNT(*) as processing FROM orders WHERE order_status IN ('confirmed', 'preparing')");
        const [[{ delivered }]] = await pool.query("SELECT COUNT(*) as delivered FROM orders WHERE order_status = 'delivered'");
        const [[{ cancelled }]] = await pool.query("SELECT COUNT(*) as cancelled FROM orders WHERE order_status = 'cancelled'");

        res.render("admin/orders", {
            title: "Manage Orders",
            currentPage: "orders",
            orders,
            filterStatus: status || "",
            stats: { total, pending, processing, delivered, cancelled }
        });
    } catch (error) {
        console.error("❌ Error listing orders:", error);
        res.status(500).send("Server Error");
    }
});

// Update Order Status
router.post("/orders/:id/status", requireAdmin, async (req, res) => {
    const { order_status } = req.body;
    try {
        await pool.query("UPDATE orders SET order_status = ? WHERE id = ?", [order_status, req.params.id]);
        res.redirect("/admin/orders");
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        res.status(500).send("Server Error");
    }
});

// ==========================================================
// CUSTOMERS ROUTES
// ==========================================================

router.get("/customers", requireAdmin, async (req, res) => {
    try {
        const [customers] = await pool.query(`
            SELECT u.*, COUNT(o.id) as order_count, COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.customer_id AND o.payment_status = 'paid'
            WHERE u.role_id = ?
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `, [ROLES.CUSTOMER]);

        res.render("admin/customers", {
            title: "Customers Directory",
            currentPage: "customers",
            customers
        });
    } catch (error) {
        console.error("❌ Error listing customers:", error);
        res.status(500).send("Server Error");
    }
});

// ==========================================================
// VENDORS ROUTES (FULL MANAGEMENT SUITE)
// ==========================================================

// 1. All Vendors with Search, Filters & Pagination
router.get("/vendors", requireAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : "";
        const statusFilter = req.query.status || "all";
        const verificationFilter = req.query.verification_status || "all";

        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push("(v.business_name LIKE ? OR v.owner_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.username LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        if (statusFilter !== "all") {
            whereClauses.push("v.status = ?");
            params.push(statusFilter);
        }

        if (verificationFilter !== "all") {
            whereClauses.push("v.verification_status = ?");
            params.push(verificationFilter);
        }

        const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // Total count for pagination
        const [countRes] = await pool.query(`
            SELECT COUNT(*) as total
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            ${whereSql}
        `, params);
        const totalVendors = countRes[0].total;
        const totalPages = Math.ceil(totalVendors / limit);

        // Fetch vendors list
        const [vendors] = await pool.query(`
            SELECT v.*, u.username, u.email as user_email, u.mobile as user_mobile, u.status as user_status,
                   (SELECT COUNT(*) FROM products p WHERE p.vendor_id = v.id) as product_count,
                   (SELECT vat.id FROM vendor_activation_tokens vat WHERE vat.vendor_id = v.id AND vat.used_at IS NULL AND vat.expires_at > NOW() LIMIT 1) as has_pending_activation
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            ${whereSql}
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.render("admin/vendors", {
            title: "Vendor Management",
            currentPage: "vendors",
            vendors,
            totalVendors,
            totalPages,
            currentPageNum: page,
            search,
            statusFilter,
            verificationFilter,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error listing vendors:", error);
        res.status(500).send("Server Error");
    }
});

// 2. Add New Vendor Form (GET)
router.get("/vendors/add", requireAdmin, (req, res) => {
    const flashForm = req.flash("form");
    res.render("admin/vendor-add", {
        title: "Register New Beverage Vendor",
        currentPage: "vendor-add",
        error_msg: req.flash("error")[0] || null,
        form: flashForm.length > 0 ? flashForm[0] : {}
    });
});

// 3. Add New Vendor Submission (POST with atomic transaction)
router.post("/vendors/add", requireAdmin, upload.uploadDoc.single("license_doc"), async (req, res) => {
    const {
        business_name,
        address,
        city,
        state,
        pincode,
        license_number,
        owner_name,
        username,
        email,
        mobile,
        commission_rate,
        verification_status,
        status,
        send_invitation
    } = req.body;

    const cleanupUpload = () => {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
    };

    // Validations
    if (!business_name || !business_name.trim()) {
        cleanupUpload();
        req.flash("error", "Shop / Business name is required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    if (!owner_name || !owner_name.trim()) {
        cleanupUpload();
        req.flash("error", "Owner name is required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
        cleanupUpload();
        req.flash("error", "A valid email address is required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!mobile || !indianMobileRegex.test(mobile.trim())) {
        cleanupUpload();
        req.flash("error", "Mobile number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!username || !usernameRegex.test(username.trim())) {
        cleanupUpload();
        req.flash("error", "Username must be 3-30 characters with alphanumeric characters and underscores only.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const pincodeRegex = /^\d{6}$/;
    if (!pincode || !pincodeRegex.test(pincode.trim())) {
        cleanupUpload();
        req.flash("error", "Pincode must be exactly 6 digits.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    if (!address || !city || !state) {
        cleanupUpload();
        req.flash("error", "Address, City, and State are required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    if (!license_number || !license_number.trim()) {
        cleanupUpload();
        req.flash("error", "License number is required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    if (!req.file) {
        cleanupUpload();
        req.flash("error", "Trade / Liquor / FSSAI license document upload is required.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const commRate = parseFloat(commission_rate);
    if (isNaN(commRate) || commRate < 0 || commRate > 50) {
        cleanupUpload();
        req.flash("error", "Commission percentage must be between 0% and 50%.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedUsername = username.toLowerCase().trim();
    const sanitizedMobile = mobile.trim();

    // Check uniqueness
    const [existingUsers] = await pool.query(
        "SELECT id, email, username, mobile FROM users WHERE email = ? OR username = ? OR mobile = ?",
        [sanitizedEmail, sanitizedUsername, sanitizedMobile]
    );

    if (existingUsers.length > 0) {
        cleanupUpload();
        const conflict = existingUsers[0];
        let errMsg = "An account with these details already exists.";
        if (conflict.email === sanitizedEmail) errMsg = "Email address is already in use.";
        else if (conflict.username === sanitizedUsername) errMsg = "Username is already taken.";
        else if (conflict.mobile === sanitizedMobile) errMsg = "Mobile number is already registered.";
        req.flash("error", errMsg);
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    }

    // Atomic transaction
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const nameParts = owner_name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || null;
        const initialStatus = status || "active";
        const initialVerification = verification_status || "approved";

        // Generate initial random password hash
        const tempPassword = crypto.randomBytes(32).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 1. Insert User record
        const [userInsert] = await connection.query(`
            INSERT INTO users (role_id, username, first_name, last_name, email, mobile, password_hash, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ROLES.VENDOR,
            sanitizedUsername,
            firstName,
            lastName,
            sanitizedEmail,
            sanitizedMobile,
            passwordHash,
            initialStatus
        ]);
        const newUserId = userInsert.insertId;

        // 2. Insert Vendor record
        const licenseDocPath = `/uploads/docs/${req.file.filename}`;
        const [vendorInsert] = await connection.query(`
            INSERT INTO vendors (
                user_id, business_name, owner_name, business_email, business_mobile,
                license_number, license_document, address, city, state, pincode,
                commission_rate, verification_status, status, approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newUserId,
            business_name.trim(),
            owner_name.trim(),
            sanitizedEmail,
            sanitizedMobile,
            license_number.trim(),
            licenseDocPath,
            address.trim(),
            city.trim(),
            state.trim(),
            pincode.trim(),
            commRate,
            initialVerification,
            initialStatus,
            initialVerification === 'approved' ? new Date() : null
        ]);
        const newVendorId = vendorInsert.insertId;

        // 3. Create activation token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        await connection.query(`
            INSERT INTO vendor_activation_tokens (vendor_id, token_hash, expires_at)
            VALUES (?, ?, ?)
        `, [newVendorId, tokenHash, expiresAt]);

        // 4. Log Audit
        await logAudit({
            userId: req.session.admin ? req.session.admin.id : null,
            action: "VENDOR_CREATED",
            module: "VENDOR_MANAGEMENT",
            description: `Admin created vendor '${business_name.trim()}' (ID: ${newVendorId}, User ID: ${newUserId}, Username: ${sanitizedUsername})`,
            req,
            connection
        });

        await connection.commit();

        // 5. Send invitation email
        if (send_invitation === "true" || send_invitation === true) {
            try {
                await sendVendorInvitationEmail({
                    email: sanitizedEmail,
                    vendorName: business_name.trim(),
                    ownerName: owner_name.trim(),
                    username: sanitizedUsername,
                    rawToken: rawToken,
                    expiresInHours: 48
                });
            } catch (mailErr) {
                console.warn("⚠️ Vendor invitation email warning:", mailErr.message);
            }
        }

        req.flash("success", `Vendor '${business_name.trim()}' successfully registered and invitation dispatched!`);
        return res.redirect("/admin/vendors");
    } catch (err) {
        await connection.rollback();
        cleanupUpload();
        console.error("❌ Error registering vendor:", err);
        req.flash("error", "Database transaction failed. Vendor was not created.");
        req.flash("form", req.body);
        return res.redirect("/admin/vendors/add");
    } finally {
        connection.release();
    }
});

// 4. Vendor Commissions Management
router.get("/vendors/commissions", requireAdmin, async (req, res) => {
    try {
        const search = req.query.search ? req.query.search.trim() : "";
        const statusFilter = req.query.status || "all";

        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push("(o.order_number LIKE ? OR v.business_name LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        if (statusFilter !== "all") {
            whereClauses.push("c.status = ?");
            params.push(statusFilter);
        }

        const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // Summary metrics
        const [sumRes] = await pool.query(`
            SELECT
                COUNT(*) as totalRecords,
                COALESCE(SUM(c.order_amount), 0) as totalGross,
                COALESCE(SUM(c.commission_amount), 0) as totalPlatformFee,
                COALESCE(SUM(c.vendor_amount), 0) as totalVendorAmount,
                COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.vendor_amount ELSE 0 END), 0) as pendingAmount,
                COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pendingCount
            FROM commissions c
        `);

        // Records list
        const [commissions] = await pool.query(`
            SELECT c.*, v.business_name, v.owner_name, o.order_number
            FROM commissions c
            JOIN vendors v ON c.vendor_id = v.id
            JOIN orders o ON c.order_id = o.id
            ${whereSql}
            ORDER BY c.created_at DESC
        `, params);

        res.render("admin/vendor-commissions", {
            title: "Vendor Commissions & Payouts",
            currentPage: "vendor-commissions",
            commissions,
            summary: sumRes[0],
            search,
            statusFilter,
            success_msg: req.flash("success")[0] || null
        });
    } catch (error) {
        console.error("❌ Error listing commissions:", error);
        res.status(500).send("Server Error");
    }
});

// 5. Update Commission Status
router.post("/vendors/commissions/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query("UPDATE commissions SET status = ? WHERE id = ?", [status, req.params.id]);
        await logAudit({
            userId: req.session.admin ? req.session.admin.id : null,
            action: "COMMISSION_STATUS_UPDATED",
            module: "COMMISSIONS",
            description: `Commission ID ${req.params.id} updated to status '${status}'`,
            req
        });
        req.flash("success", `Commission record #${req.params.id} updated to '${status}'.`);
        res.redirect("/admin/vendors/commissions");
    } catch (error) {
        console.error("❌ Error updating commission status:", error);
        res.status(500).send("Server Error");
    }
});

// 6. Vendor Performance Reports
router.get("/vendors/reports", requireAdmin, async (req, res) => {
    try {
        const period = req.query.period || "all";
        let startDate = req.query.start_date;
        let endDate = req.query.end_date;

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

        // Totals across all vendors
        const [totalRes] = await pool.query(`
            SELECT
                COUNT(DISTINCT oi.order_id) as orderCount,
                COALESCE(SUM(oi.total_price), 0) as grossSales,
                COALESCE(SUM(c.commission_amount), 0) as commissionEarned,
                COALESCE(SUM(oi.total_price - COALESCE(c.commission_amount, 0)), 0) as netPayable
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN commissions c ON c.order_id = o.id AND c.vendor_id = oi.vendor_id
            WHERE 1=1 ${dateClause}
        `, dateParams);

        // Grouped by vendor
        const [reportData] = await pool.query(`
            SELECT
                v.id as vendor_id,
                v.business_name,
                v.owner_name,
                v.commission_rate,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                COUNT(DISTINCT oi.order_id) as order_count,
                COALESCE(SUM(oi.total_price), 0) as gross_sales,
                COALESCE(SUM(c.commission_amount), 0) as commission_amount,
                COALESCE(SUM(oi.total_price - COALESCE(c.commission_amount, 0)), 0) as net_payable
            FROM vendors v
            LEFT JOIN order_items oi ON oi.vendor_id = v.id
            LEFT JOIN orders o ON oi.order_id = o.id ${dateClause}
            LEFT JOIN commissions c ON c.order_id = o.id AND c.vendor_id = v.id
            GROUP BY v.id
            ORDER BY gross_sales DESC
        `, dateParams);

        res.render("admin/vendor-reports", {
            title: "Vendor Performance Reports",
            currentPage: "vendor-reports",
            totals: totalRes[0],
            reportData,
            period,
            startDate,
            endDate
        });
    } catch (error) {
        console.error("❌ Error generating vendor reports:", error);
        res.status(500).send("Server Error");
    }
});

// 7. View Vendor Profile
router.get("/vendors/:id", requireAdmin, async (req, res) => {
    try {
        const [vendors] = await pool.query(`
            SELECT v.*, u.username, u.email as user_email, u.mobile as user_mobile
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);

        if (!vendors.length) {
            req.flash("error", "Vendor not found.");
            return res.redirect("/admin/vendors");
        }
        const vendor = vendors[0];

        // Stats
        const [productStats] = await pool.query(`
            SELECT
                COUNT(*) as totalProducts,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as activeProducts
            FROM products WHERE vendor_id = ?
        `, [vendor.id]);

        const [orderStats] = await pool.query(`
            SELECT
                COUNT(DISTINCT oi.order_id) as totalOrders,
                COUNT(DISTINCT CASE WHEN o.order_status = 'delivered' THEN oi.order_id END) as completedOrders,
                COALESCE(SUM(oi.total_price), 0) as grossSales
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = ?
        `, [vendor.id]);

        const [commStats] = await pool.query(`
            SELECT COALESCE(SUM(commission_amount), 0) as totalCommission
            FROM commissions WHERE vendor_id = ?
        `, [vendor.id]);

        const [recentProducts] = await pool.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.vendor_id = ?
            ORDER BY p.created_at DESC
            LIMIT 5
        `, [vendor.id]);

        const [recentOrders] = await pool.query(`
            SELECT o.id, o.order_number, o.created_at, o.order_status,
                   SUM(oi.total_price) as vendor_total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE oi.vendor_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [vendor.id]);

        res.render("admin/vendor-view", {
            title: `${vendor.business_name} - Vendor Details`,
            currentPage: "vendors",
            vendor,
            stats: {
                totalProducts: productStats[0].totalProducts,
                activeProducts: productStats[0].activeProducts,
                totalOrders: orderStats[0].totalOrders,
                completedOrders: orderStats[0].completedOrders,
                grossSales: orderStats[0].grossSales,
                totalCommission: commStats[0].totalCommission
            },
            recentProducts,
            recentOrders,
            success_msg: req.flash("success")[0] || null,
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error fetching vendor details:", error);
        res.status(500).send("Server Error");
    }
});

// 8. Edit Vendor Form (GET)
router.get("/vendors/:id/edit", requireAdmin, async (req, res) => {
    try {
        const [vendors] = await pool.query(`
            SELECT v.*, u.username, u.email as user_email, u.mobile as user_mobile
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);

        if (!vendors.length) {
            req.flash("error", "Vendor not found.");
            return res.redirect("/admin/vendors");
        }

        res.render("admin/vendor-edit", {
            title: `Edit ${vendors[0].business_name}`,
            currentPage: "vendors",
            vendor: vendors[0],
            error_msg: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("❌ Error fetching vendor for edit:", error);
        res.status(500).send("Server Error");
    }
});

// 9. Update Vendor Profile (POST)
router.post("/vendors/:id/edit", requireAdmin, upload.uploadDoc.single("license_doc"), async (req, res) => {
    const {
        business_name,
        address,
        city,
        state,
        pincode,
        license_number,
        owner_name,
        email,
        mobile,
        commission_rate,
        verification_status,
        status
    } = req.body;

    try {
        const [vendors] = await pool.query("SELECT * FROM vendors WHERE id = ?", [req.params.id]);
        if (!vendors.length) {
            req.flash("error", "Vendor not found.");
            return res.redirect("/admin/vendors");
        }
        const vendor = vendors[0];

        let licenseDocPath = vendor.license_document;
        if (req.file) {
            licenseDocPath = `/uploads/docs/${req.file.filename}`;
        }

        const nameParts = (owner_name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || vendor.owner_name;
        const lastName = nameParts.slice(1).join(" ") || null;

        await pool.query(`
            UPDATE vendors
            SET business_name = ?, owner_name = ?, business_email = ?, business_mobile = ?,
                license_number = ?, license_document = ?, address = ?, city = ?, state = ?, pincode = ?,
                commission_rate = ?, verification_status = ?, status = ?
            WHERE id = ?
        `, [
            business_name.trim(),
            owner_name.trim(),
            email.toLowerCase().trim(),
            mobile.trim(),
            license_number.trim(),
            licenseDocPath,
            address.trim(),
            city.trim(),
            state.trim(),
            pincode.trim(),
            parseFloat(commission_rate) || 10.00,
            verification_status,
            status,
            vendor.id
        ]);

        await pool.query(`
            UPDATE users
            SET first_name = ?, last_name = ?, email = ?, mobile = ?, status = ?
            WHERE id = ?
        `, [
            firstName,
            lastName,
            email.toLowerCase().trim(),
            mobile.trim(),
            status,
            vendor.user_id
        ]);

        await logAudit({
            userId: req.session.admin ? req.session.admin.id : null,
            action: "VENDOR_UPDATED",
            module: "VENDOR_MANAGEMENT",
            description: `Admin updated vendor '${business_name.trim()}' (ID: ${vendor.id})`,
            req
        });

        req.flash("success", "Vendor profile updated successfully.");
        return res.redirect(`/admin/vendors/${vendor.id}`);
    } catch (error) {
        console.error("❌ Error updating vendor:", error);
        req.flash("error", "Failed to update vendor.");
        return res.redirect(`/admin/vendors/${req.params.id}/edit`);
    }
});

// 10. Verify / Reject Vendor Status
router.post("/vendors/:id/verify", requireAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        const approvedAt = status === "approved" ? new Date() : null;
        await pool.query(
            "UPDATE vendors SET verification_status = ?, approved_at = COALESCE(?, approved_at) WHERE id = ?",
            [status, approvedAt, req.params.id]
        );

        const [vendors] = await pool.query("SELECT user_id, business_name FROM vendors WHERE id = ?", [req.params.id]);
        if (vendors.length) {
            await createNotification({
                userId: vendors[0].user_id,
                title: `Vendor Verification: ${status.toUpperCase()}`,
                message: `Your vendor account verification status has been updated to '${status}'.`,
                type: status === "approved" ? "success" : "warning",
                link: "/vendor/dashboard"
            });
        }

        await logAudit({
            userId: req.session.admin ? req.session.admin.id : null,
            action: "VENDOR_VERIFIED",
            module: "VENDOR_MANAGEMENT",
            description: `Vendor ID ${req.params.id} verification changed to '${status}'`,
            req
        });

        req.flash("success", `Vendor #${req.params.id} verification set to '${status}'.`);
        res.redirect(req.get("referer") || "/admin/vendors");
    } catch (error) {
        console.error("❌ Error verifying vendor:", error);
        res.status(500).send("Server Error");
    }
});

// 11. Vendor Account Status Toggle (Active / Inactive / Suspended)
router.post("/vendors/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        const [vendors] = await pool.query("SELECT user_id FROM vendors WHERE id = ?", [req.params.id]);
        if (vendors.length) {
            await pool.query("UPDATE vendors SET status = ? WHERE id = ?", [status, req.params.id]);
            await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, vendors[0].user_id]);

            await logAudit({
                userId: req.session.admin ? req.session.admin.id : null,
                action: "VENDOR_STATUS_CHANGED",
                module: "VENDOR_MANAGEMENT",
                description: `Vendor ID ${req.params.id} account status changed to '${status}'`,
                req
            });
        }

        req.flash("success", `Vendor #${req.params.id} status changed to '${status}'.`);
        res.redirect(req.get("referer") || "/admin/vendors");
    } catch (error) {
        console.error("❌ Error updating vendor status:", error);
        res.status(500).send("Server Error");
    }
});

// 12. Resend Activation Invitation
router.post("/vendors/:id/resend-invitation", requireAdmin, async (req, res) => {
    try {
        const [vendors] = await pool.query(`
            SELECT v.*, u.username, u.email as user_email
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);

        if (!vendors.length) {
            req.flash("error", "Vendor not found.");
            return res.redirect("/admin/vendors");
        }
        const vendor = vendors[0];

        // Invalidate old tokens
        await pool.query("UPDATE vendor_activation_tokens SET used_at = NOW() WHERE vendor_id = ? AND used_at IS NULL", [vendor.id]);

        // Generate fresh token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await pool.query(`
            INSERT INTO vendor_activation_tokens (vendor_id, token_hash, expires_at)
            VALUES (?, ?, ?)
        `, [vendor.id, tokenHash, expiresAt]);

        await sendVendorInvitationEmail({
            email: vendor.business_email || vendor.user_email,
            vendorName: vendor.business_name,
            ownerName: vendor.owner_name,
            username: vendor.username,
            rawToken: rawToken,
            expiresInHours: 48
        });

        await logAudit({
            userId: req.session.admin ? req.session.admin.id : null,
            action: "VENDOR_INVITATION_RESENT",
            module: "VENDOR_MANAGEMENT",
            description: `Resent activation invitation for vendor '${vendor.business_name}' (ID: ${vendor.id})`,
            req
        });

        req.flash("success", `Fresh activation invitation sent to ${vendor.business_email || vendor.user_email}.`);
        res.redirect(req.get("referer") || "/admin/vendors");
    } catch (error) {
        console.error("❌ Error resending invitation:", error);
        req.flash("error", "Could not send invitation email.");
        res.redirect(req.get("referer") || "/admin/vendors");
    }
});

// ==========================================================
// PAYMENTS ROUTES
// ==========================================================

router.get("/payments", requireAdmin, async (req, res) => {
    try {
        const [payments] = await pool.query(`
            SELECT p.*, o.order_number, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as customer_name
            FROM payments p
            JOIN orders o ON p.order_id = o.id
            JOIN users u ON o.customer_id = u.id
            ORDER BY p.created_at DESC
        `);

        res.render("admin/payments", {
            title: "Transaction Records",
            currentPage: "payments",
            payments
        });
    } catch (error) {
        console.error("❌ Error listing payments:", error);
        res.status(500).send("Server Error");
    }
});

// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;