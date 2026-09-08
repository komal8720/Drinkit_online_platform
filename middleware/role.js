// ==========================================================
// DRINKIT - ROLE AUTHORIZATION MIDDLEWARE
// ==========================================================

const ROLES = require("../config/roles");

/**
 * Generic middleware to restrict access to specific roles.
 * Checks against the server session populated from database records.
 * Never trusts client request inputs.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const currentUser = req.session ? (req.session.user || req.session.admin) : null;

        if (!currentUser) {
            req.flash("error", "Please login to access this page.");
            return res.redirect("/auth/login");
        }

        const userRoleId = Number(currentUser.role_id);

        if (!allowedRoles.includes(userRoleId)) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Access denied. You do not have permission to access this resource."
            });
        }

        next();
    };
}

const { pool } = require("../config/db");

/**
 * Middleware ensuring only VENDOR (role_id = 2) can access vendor routes.
 * Binds req.vendor (full vendor record) and req.user (full user record) verified from DB.
 */
async function requireVendor(req, res, next) {
    const currentUser = req.session ? (req.session.user || req.session.vendorUser) : null;

    if (!currentUser) {
        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(401).json({ success: false, message: "Please login to access the vendor portal." });
        }
        if (req.flash) {
            req.flash("error", "Please login to access the vendor portal.");
        }
        return res.redirect("/vendor/login");
    }

    const userRoleId = Number(currentUser.role_id);
    if (userRoleId !== ROLES.VENDOR) {
        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(403).json({ success: false, message: "Access denied. Authorized vendors only." });
        }
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Access denied. Authorized vendors only."
        });
    }

    try {
        const [users] = await pool.query(
            "SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) as name, email, username, mobile, role_id, status FROM users WHERE id = ?",
            [currentUser.id]
        );

        if (!users.length || users[0].status !== 'active') {
            req.session.destroy();
            return res.redirect("/vendor/login?error=account_disabled");
        }

        const [vendors] = await pool.query(
            "SELECT * FROM vendors WHERE user_id = ?",
            [currentUser.id]
        );

        if (!vendors.length) {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "No vendor store associated with this account."
            });
        }

        const vendor = vendors[0];

        if (vendor.status === 'suspended' || vendor.verification_status === 'suspended' || vendor.verification_status === 'rejected') {
            return res.status(403).render("user/403", {
                title: "403 - Forbidden",
                message: "Your vendor account has been suspended or rejected. Please contact administrator."
            });
        }

        req.user = users[0];
        req.vendor = vendor;
        res.locals.currentVendor = vendor;
        res.locals.currentUser = users[0];

        next();
    } catch (err) {
        console.error("requireVendor error:", err);
        return res.status(500).send("Internal Server Error");
    }
}

/**
 * Middleware ensuring only CUSTOMER (role_id = 3) can access customer routes.
 */
function requireCustomer(req, res, next) {
    const currentUser = req.session ? (req.session.user || req.session.admin) : null;

    if (!currentUser) {
        req.flash("error", "Please login to continue.");
        return res.redirect("/auth/login");
    }

    if (Number(currentUser.role_id) !== ROLES.CUSTOMER) {
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Access denied. Customer access only."
        });
    }

    next();
}

/**
 * Middleware ensuring only DELIVERY_PARTNER (role_id = 4) can access delivery routes.
 */
function requireDeliveryPartner(req, res, next) {
    const currentUser = req.session ? (req.session.user || req.session.admin) : null;

    if (!currentUser) {
        req.flash("error", "Please login as delivery partner.");
        return res.redirect("/auth/login");
    }

    if (Number(currentUser.role_id) !== ROLES.DELIVERY_PARTNER) {
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Access denied. Delivery partners only."
        });
    }

    next();
}

module.exports = {
    requireRole,
    requireVendor,
    requireCustomer,
    requireDeliveryPartner
};
