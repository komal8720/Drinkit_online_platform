// ==========================================================
// DRINKIT - AUTHENTICATION MIDDLEWARE
// ==========================================================

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    req.flash("error", "Please login to access this page.");
    res.redirect("/auth/login");
}

module.exports = {
    ensureAuthenticated
};
