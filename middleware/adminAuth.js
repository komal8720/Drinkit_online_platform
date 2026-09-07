// ==========================================================
// DRINKIT ADMIN AUTHENTICATION
// ==========================================================

const ROLES = require("../config/roles");

function requireAdmin(req, res, next) {
    // 1. Authorized administrator with SUPER_ADMIN role
    if (
        req.session &&
        req.session.admin &&
        Number(req.session.admin.role_id) === ROLES.SUPER_ADMIN
    ) {
        return next();
    }

    // 2. Logged in as a customer or non-super-admin user attempting to access admin
    if (
        req.session &&
        req.session.user &&
        Number(req.session.user.role_id) !== ROLES.SUPER_ADMIN
    ) {
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Access denied. Administrator privileges required."
        });
    }

    // 3. Unauthenticated user redirected to admin login
    return res.redirect("/admin/login");
}

module.exports = requireAdmin;