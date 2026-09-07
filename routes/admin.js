// ==========================================================
// DRINKIT ADMIN ROUTES
// ==========================================================

const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const requireAdmin = require("../middleware/adminAuth");
const upload = require("../middleware/upload");
const ROLES = require("../config/roles");

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
        title: "Admin Login"
    });
});

// ==========================================================
// ADMIN LOGIN (POST)
// ==========================================================

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Please provide email and password."
            });
        }

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Invalid email or password."
            });
        }

        const user = users[0];

        if (Number(user.role_id) !== ROLES.SUPER_ADMIN) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Access denied. Authorized administrators only."
            });
        }

        if (user.status !== "active") {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Your account is not active. Please contact support."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Invalid email or password."
            });
        }

        await pool.query(
            "UPDATE users SET last_login_at = NOW() WHERE id = ?",
            [user.id]
        );

        req.session.admin = {
            id: user.id,
            role_id: user.role_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            mobile: user.mobile
        };

        return res.redirect("/admin/dashboard");

    } catch (error) {
        console.error("❌ Admin Login Error:", error);
        return res.render("admin/login", {
            title: "Admin Login",
            error: "Something went wrong. Please try again."
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
// VENDORS ROUTES
// ==========================================================

router.get("/vendors", requireAdmin, async (req, res) => {
    try {
        const [vendors] = await pool.query(`
            SELECT v.*, u.email, u.mobile, u.status as user_status
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            ORDER BY v.created_at DESC
        `);

        res.render("admin/vendors", {
            title: "Beverage Vendors",
            currentPage: "vendors",
            vendors
        });
    } catch (error) {
        console.error("❌ Error listing vendors:", error);
        res.status(500).send("Server Error");
    }
});

// Verify Vendor Status
router.post("/vendors/:id/verify", requireAdmin, async (req, res) => {
    const { status } = req.body; // approved / rejected / suspended
    try {
        await pool.query("UPDATE vendors SET verification_status = ? WHERE id = ?", [status, req.params.id]);
        res.redirect("/admin/vendors");
    } catch (error) {
        console.error("❌ Error verifying vendor:", error);
        res.status(500).send("Server Error");
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