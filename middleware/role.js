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

/**
 * Middleware ensuring only VENDOR (role_id = 2) can access vendor routes.
 */
function requireVendor(req, res, next) {
    const currentUser = req.session ? (req.session.user || req.session.admin) : null;

    if (!currentUser) {
        req.flash("error", "Please login to access the vendor portal.");
        return res.redirect("/auth/login");
    }

    if (Number(currentUser.role_id) !== ROLES.VENDOR) {
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Access denied. Authorized vendors only."
        });
    }

    next();
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
