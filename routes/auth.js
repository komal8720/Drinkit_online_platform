// ==========================================================
// DRINKIT - AUTHENTICATION ROUTER
// ==========================================================

const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { sendOtpEmail } = require("../services/mail.service");

const router = express.Router();


// ==========================================================
// GET LOGIN PAGE
// ==========================================================

router.get("/login", (req, res) => {
    // If user is already logged in, redirect to home
    if (req.session && req.session.user) {
        return res.redirect("/");
    }

    res.render("user/login", {
        title: "Login - Drinkit"
    });
});


// ==========================================================
// POST LOGIN
// ==========================================================

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            req.flash("error", "Please provide email and password.");
            return res.redirect("/auth/login");
        }

        // Fetch user from database
        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            req.flash("error", "Invalid email or password.");
            return res.redirect("/auth/login");
        }

        const user = users[0];

        // Check if user status is active
        if (user.status !== "active") {
            req.flash("error", "Your account is not active. Please contact support.");
            return res.redirect("/auth/login");
        }

        // Verify password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            req.flash("error", "Invalid email or password.");
            return res.redirect("/auth/login");
        }

        // Update last_login_at timestamp
        await pool.query(
            "UPDATE users SET last_login_at = NOW() WHERE id = ?",
            [user.id]
        );

        // Store user in session
        req.session.user = {
            id: user.id,
            role_id: user.role_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            mobile: user.mobile,
            profile_image: user.profile_image
        };

        req.flash("success", `Welcome back, ${user.first_name}!`);
        return res.redirect("/");

    } catch (error) {
        console.error("❌ Login Error:", error);
        req.flash("error", "Something went wrong during login. Please try again.");
        return res.redirect("/auth/login");
    }
});


// ==========================================================
// GET REGISTER PAGE
// ==========================================================

router.get("/register", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/");
    }

    res.render("user/register", {
        title: "Register - Drinkit"
    });
});


// ==========================================================
// POST SEND OTP (AJAX Endpoint)
// ==========================================================

router.post("/send-otp", async (req, res) => {
    const { email, first_name } = req.body;

    try {
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Email address is required." });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if email already registered in DB
        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "Email is already registered." });
        }

        // 2. Generate 6-digit OTP
        const otpCode = String(Math.floor(100000 + Math.random() * 900000));

        // 3. Save OTP details in session with 5 minutes expiry
        req.session.emailOtp = {
            email: normalizedEmail,
            otp: otpCode,
            expiry: Date.now() + 5 * 60 * 1000
        };

        // 4. Send OTP email using Nodemailer
        try {
            await sendOtpEmail(normalizedEmail, first_name || "User", otpCode);
        } catch (mailError) {
            console.error("❌ Failed to send OTP email via SMTP:", mailError.message);
            // Log it as a fallback in console for development inspection if SMTP fails
            console.log(`[SMTP FALLBACK] OTP code for ${normalizedEmail}: ${otpCode}`);
            return res.status(500).json({ 
                success: false, 
                message: "SMTP Mail connection error. Check server console for fallback OTP." 
            });
        }

        return res.json({ success: true, message: "Verification OTP email sent successfully." });

    } catch (error) {
        console.error("❌ Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error requesting OTP." });
    }
});


// ==========================================================
// POST VERIFY OTP (AJAX Endpoint)
// ==========================================================

router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP code are required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const sessionOtp = req.session.emailOtp;

        if (!sessionOtp) {
            return res.status(400).json({ success: false, message: "No OTP was requested for this session." });
        }

        // Verify if OTP matches and is not expired
        if (sessionOtp.email !== normalizedEmail) {
            return res.status(400).json({ success: false, message: "Email address mismatch." });
        }

        if (Date.now() > sessionOtp.expiry) {
            return res.status(400).json({ success: false, message: "OTP code has expired." });
        }

        if (sessionOtp.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: "Invalid OTP code." });
        }

        // Mark email as verified in session
        req.session.emailOtpVerified = normalizedEmail;

        return res.json({ success: true, message: "Email verified successfully." });

    } catch (error) {
        console.error("❌ Verify OTP Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error verifying OTP." });
    }
});


// ==========================================================
// POST REGISTER
// ==========================================================

router.post("/register", async (req, res) => {
    const { first_name, last_name, email, mobile, password, confirm_password } = req.body;

    try {
        if (!first_name || !email || !password || !confirm_password) {
            req.flash("error", "Please fill in all required fields.");
            return res.redirect("/auth/register");
        }

        if (password !== confirm_password) {
            req.flash("error", "Passwords do not match.");
            return res.redirect("/auth/register");
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Enforce OTP verification security check
        if (!req.session.emailOtpVerified || req.session.emailOtpVerified !== normalizedEmail) {
            req.flash("error", "Please verify your email address via OTP first.");
            return res.redirect("/auth/register");
        }

        // 2. Check if email already exists
        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            req.flash("error", "Email is already registered.");
            return res.redirect("/auth/register");
        }

        // 3. Check if mobile already exists (if provided)
        if (mobile && mobile.trim()) {
            const [existingMobile] = await pool.query(
                "SELECT id FROM users WHERE mobile = ? LIMIT 1",
                [mobile.trim()]
            );

            if (existingMobile.length > 0) {
                req.flash("error", "Mobile number is already registered.");
                return res.redirect("/auth/register");
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert into database (Default role_id = 1 for Customer, status = 'active')
        await pool.query(
            "INSERT INTO users (role_id, first_name, last_name, email, mobile, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [1, first_name.trim(), last_name ? last_name.trim() : null, normalizedEmail, mobile ? mobile.trim() : null, passwordHash, "active"]
        );

        // Clear OTP states after successful registration
        req.session.emailOtp = null;
        req.session.emailOtpVerified = null;

        req.flash("success", "Registration successful! Please login.");
        return res.redirect("/auth/login");

    } catch (error) {
        console.error("❌ Registration Error:", error);
        req.flash("error", "Something went wrong during registration. Please try again.");
        return res.redirect("/auth/register");
    }
});


// ==========================================================
// GET LOGOUT
// ==========================================================

router.get("/logout", (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Logout Session Destroy Error:", err);
            }
            res.redirect("/");
        });
    } else {
        res.redirect("/");
    }
});

module.exports = router;
