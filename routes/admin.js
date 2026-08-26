// ==========================================================
// DRINKIT ADMIN ROUTES
// ==========================================================

const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const requireAdmin = require("../middleware/adminAuth");

const router = express.Router();


// ==========================================================
// ADMIN LOGIN (GET)
// ==========================================================

router.get("/login", (req, res) => {
    // If admin is already logged in, redirect to dashboard
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

        // Fetch user from database
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

        // Check if user is SUPER_ADMIN (role_id = 1)
        if (user.role_id !== 1) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Access denied. Authorized administrators only."
            });
        }

        // Check if user status is active
        if (user.status !== "active") {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Your account is not active. Please contact support."
            });
        }

        // Verify password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.render("admin/login", {
                title: "Admin Login",
                error: "Invalid email or password."
            });
        }

        // Update last_login_at timestamp
        await pool.query(
            "UPDATE users SET last_login_at = NOW() WHERE id = ?",
            [user.id]
        );

        // Store admin in session
        req.session.admin = {
            id: user.id,
            role_id: user.role_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            mobile: user.mobile
        };

        // Redirect to dashboard
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
// ADMIN HOME
// ==========================================================

router.get("/", requireAdmin, (req, res) => {

    res.redirect("/admin/dashboard");

});


// ==========================================================
// ADMIN DASHBOARD
// ==========================================================

router.get("/dashboard", requireAdmin, (req, res) => {

    res.render("admin/dashboard", {
        title: "Drinkit Admin Dashboard"
    });

});


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;