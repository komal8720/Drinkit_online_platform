require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const { pool } = require("../config/db");
const ROLES = require("../config/roles");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "test_verification_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.user = req.session.user || null;
    res.locals.appName = "Drinkit";
    res.locals.selectedLocation = "Nagar, Maharashtra";
    res.locals.currentLang = "EN";
    res.locals.langCode = "en";
    res.locals.__ = (k) => k;
    res.locals.cartCount = 0;
    res.locals.wishlistProductIds = [];
    next();
});

// Test helper to set session setupOtp
app.post("/test-helper/set-setup-otp", (req, res) => {
    const { email, otp } = req.body;
    req.session.setupOtp = {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        expiry: Date.now() + 5 * 60 * 1000
    };
    res.json({ ok: true });
});

const authRouter = require("../routes/auth");
const adminRoutes = require("../routes/admin");
const vendorRouter = require("../routes/vendorRouter");
const deliveryRouter = require("../routes/deliveryRouter");
const userRouter = require("../routes/userRouter");

app.use("/auth", authRouter);
app.use("/admin", adminRoutes);
app.use("/vendor", vendorRouter);
app.use("/delivery", deliveryRouter);
app.use("/", userRouter);

const PORT = 3098;

async function runVerification() {
    const server = app.listen(PORT);
    console.log(`\n=============================================================`);
    console.log(`   DRINKIT: VENDOR-USER RELATIONSHIP VERIFICATION SUITE      `);
    console.log(`=============================================================\n`);

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  [PASS] ${message}`);
            passedTests++;
        } else {
            console.error(`  [FAIL] ${message}`);
            failedTests++;
        }
    }

    try {
        let cookies = "";

        async function request(urlPath, options = {}) {
            const headers = options.headers || {};
            if (cookies) {
                headers["Cookie"] = cookies;
            }
            if (options.body && typeof options.body === "object" && !(options.body instanceof URLSearchParams)) {
                headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(options.body);
            }
            options.headers = headers;
            options.redirect = "manual";

            const res = await fetch(`http://127.0.0.1:${PORT}${urlPath}`, options);
            const setCookieHeader = res.headers.get("set-cookie");
            if (setCookieHeader) {
                cookies = setCookieHeader.split(";")[0];
            }
            const text = await res.text();
            return { status: res.status, headers: res.headers, text };
        }

        // ============================================================
        // 1. STEP 17: VALIDATION QUERY
        // ============================================================
        console.log(">>> STEP 17: VALIDATION QUERY");
        const [mappingRows] = await pool.query(`
            SELECT
                v.id AS vendor_id,
                v.business_name,
                v.user_id,
                u.id AS linked_user_id,
                u.email,
                u.role_id
            FROM vendors v
            LEFT JOIN users u ON v.user_id = u.id
        `);

        assert(mappingRows.length > 0, `Found ${mappingRows.length} vendor record(s)`);

        for (const row of mappingRows) {
            console.log(`   Checking Vendor #${row.vendor_id} ("${row.business_name}"):`);
            console.log(`   Linked to User #${row.linked_user_id} (${row.email}), role_id = ${row.role_id}`);

            assert(row.user_id === row.linked_user_id, `vendors.user_id matches users.id (${row.user_id})`);
            assert(row.role_id === ROLES.VENDOR, `linked_user.role_id is ROLES.VENDOR (role_id = 2)`);
            assert(row.user_id !== 1, `vendors.user_id does NOT point to Super Admin (user_id != 1)`);
            assert(row.role_id !== ROLES.SUPER_ADMIN, `linked user is not SUPER_ADMIN (role_id != 1)`);
            assert(row.role_id !== ROLES.CUSTOMER, `linked user is not CUSTOMER (role_id != 3)`);
            assert(row.role_id !== ROLES.DELIVERY_PARTNER, `linked user is not DELIVERY_PARTNER (role_id != 4)`);
        }

        // ============================================================
        // 2. STEP 14 & 18: SUPER ADMIN INTEGRITY
        // ============================================================
        console.log("\n>>> STEP 14 & 18: SUPER ADMIN INTEGRITY CHECK");
        const [adminRows] = await pool.query("SELECT id, role_id, email FROM users WHERE id = 1");
        assert(adminRows.length === 1, "User id = 1 exists in database");
        assert(adminRows[0].role_id === ROLES.SUPER_ADMIN, "User id = 1 remains role_id = 1 (SUPER_ADMIN)");
        assert(adminRows[0].email === "rutwikghule07@gmail.com", "Super Admin email is intact (rutwikghule07@gmail.com)");

        // Admin login test
        cookies = "";
        const adminLoginRes = await request("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                email: "rutwikghule07@gmail.com",
                password: "Rutwik@123"
            })
        });
        assert(adminLoginRes.status === 302, "Super Admin login accepted (HTTP 302)");
        assert(adminLoginRes.headers.get("location") === "/admin/dashboard", "Redirects to /admin/dashboard");

        // Access admin dashboard
        const adminDashRes = await request("/admin/dashboard");
        assert(adminDashRes.status === 200, "Super Admin can access /admin/dashboard (HTTP 200)");

        // Access admin vendors directory
        const adminVendorsRes = await request("/admin/vendors");
        assert(adminVendorsRes.status === 200, "Super Admin can access /admin/vendors (HTTP 200)");
        assert(adminVendorsRes.text.includes("shop@drinkit.com"), "Vendors directory shows vendor's email 'shop@drinkit.com' instead of admin's email");

        // ============================================================
        // 3. STEP 6, 15 & 16: PASSWORD SETUP & VENDOR AUTHENTICATION
        // ============================================================
        console.log("\n>>> STEP 6, 15 & 16: PASSWORD SETUP & VENDOR AUTHENTICATION");
        cookies = ""; // clear session

        // 3a. Test password setup flow
        const vendorEmail = "shop@drinkit.com";
        const testOtp = "998877";

        // Set session OTP via helper
        await request("/test-helper/set-setup-otp", {
            method: "POST",
            body: { email: vendorEmail, otp: testOtp }
        });

        // Verify OTP
        const verifyOtpRes = await request("/auth/verify-setup-otp", {
            method: "POST",
            body: { email: vendorEmail, otp: testOtp }
        });
        assert(verifyOtpRes.status === 200, "Vendor setup OTP verified successfully");

        // Submit new password
        const newVendorPassword = "Vendor@Drinkit2026";
        const setupPassRes = await request("/auth/setup-password", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                email: vendorEmail,
                password: newVendorPassword,
                confirm_password: newVendorPassword
            })
        });
        assert(setupPassRes.status === 302, "Password setup redirected to login (HTTP 302)");

        // 3b. Authenticate as Vendor
        cookies = ""; // fresh session
        const vendorLoginRes = await request("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                email: vendorEmail,
                password: newVendorPassword
            })
        });
        assert(vendorLoginRes.status === 302, "Vendor login successful (HTTP 302)");

        // 3c. Verify Vendor Access to /vendor/dashboard
        const vendorDashRes = await request("/vendor/dashboard");
        assert(vendorDashRes.status === 200, "Vendor can access /vendor/dashboard (HTTP 200 - passes requireVendor)");

        // 3d. Verify Vendor CANNOT access /admin/dashboard
        const vendorAdminAttempt = await request("/admin/dashboard");
        assert(vendorAdminAttempt.status === 403, "Vendor attempting /admin/dashboard is blocked with HTTP 403 Forbidden");
        assert(vendorAdminAttempt.text.includes("403 - Forbidden"), "403 Forbidden page rendered for vendor on admin area");

        // 3e. Verify Vendor CANNOT login at /admin/login
        cookies = "";
        const vendorAdminLoginRes = await request("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                email: vendorEmail,
                password: newVendorPassword
            })
        });
        assert(vendorAdminLoginRes.text.includes("Access denied. Authorized administrators only."), "Vendor rejected at /admin/login");

        // ============================================================
        // 4. CUSTOMER AUTHORIZATION CHECK
        // ============================================================
        console.log("\n>>> CUSTOMER ROLE AUTHORIZATION CHECK");
        // Login as customer
        cookies = "";
        const custLoginRes = await request("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                email: "komalkhandave8720@gmail.com",
                password: "password123" // we test or check customer access
            })
        });
        // Note: Even with unauthenticated or customer session:
        // Customer session hitting /vendor/dashboard:
        // Let's set a mock customer session or test unauthenticated vs customer
        // Accessing /vendor/dashboard without vendor role must return 403 or redirect
        const unauthVendorRes = await request("/vendor/dashboard");
        assert(unauthVendorRes.status === 302, "Unauthenticated user visiting /vendor/dashboard redirected to login");

        // ============================================================
        // 5. STEP 8, 9, 10, 11: PRESERVE VENDOR, SHOP, PRODUCT, ORDER DATA
        // ============================================================
        console.log("\n>>> STEP 8, 9, 10, 11: DATA PRESERVATION CHECKS");
        const [vendorRows] = await pool.query("SELECT * FROM vendors WHERE id = 1");
        const v = vendorRows[0];
        assert(v.id === 1, "Vendor id is 1 (preserved)");
        assert(v.business_name === "Drinkit Shop", "business_name preserved ('Drinkit Shop')");
        assert(v.owner_name === "Test Vendor", "owner_name preserved ('Test Vendor')");
        assert(v.business_email === "shop@drinkit.com", "business_email preserved ('shop@drinkit.com')");
        assert(v.business_mobile === "9876543210", "business_mobile preserved ('9876543210')");
        assert(v.verification_status === "approved", "verification_status preserved ('approved')");

        const [productRows] = await pool.query("SELECT COUNT(*) as count FROM products WHERE vendor_id = 1");
        assert(productRows[0].count === 350, "All 350 products remain linked to vendor_id = 1 (preserved)");

        const [orderItemRows] = await pool.query("SELECT COUNT(*) as count FROM order_items WHERE vendor_id = 1");
        assert(orderItemRows[0].count > 0, `All order_items remain linked to vendor_id = 1 (${orderItemRows[0].count} items preserved)`);

        const [orderRows] = await pool.query("SELECT COUNT(*) as count FROM orders");
        assert(orderRows[0].count === 14, "All 14 orders intact (preserved)");

        // ============================================================
        // 6. STEP 19: AUDIT LOG VERIFICATION
        // ============================================================
        console.log("\n>>> STEP 19: AUDIT LOG VERIFICATION");
        const [auditRows] = await pool.query(
            "SELECT * FROM audit_logs WHERE action = 'VENDOR_USER_MAPPING_REPAIRED' ORDER BY id DESC LIMIT 1"
        );
        assert(auditRows.length === 1, "Audit log entry found for 'VENDOR_USER_MAPPING_REPAIRED'");
        if (auditRows.length > 0) {
            console.log(`   Audit description: "${auditRows[0].description}"`);
            assert(auditRows[0].module === "VENDOR", "Audit log module is 'VENDOR'");
            assert(auditRows[0].user_id === 1, "Audit log performed_by is Super Admin (user_id = 1)");
        }

        console.log(`\n=============================================================`);
        console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
        console.log(`=============================================================\n`);

    } catch (err) {
        console.error("Verification suite encountered error:", err);
    } finally {
        server.close();
        pool.end();
    }
}

runVerification();
