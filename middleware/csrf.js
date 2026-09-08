// ==========================================================
// DRINKIT - CSRF PROTECTION MIDDLEWARE
// ==========================================================

const crypto = require("crypto");

/**
 * Initializes and validates CSRF tokens on incoming requests.
 */
function csrfProtection(req, res, next) {
    if (!req.session) {
        return next();
    }

    // 1. Generate CSRF token for the session if it doesn't exist
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    // Expose to all EJS views via res.locals
    res.locals.csrfToken = req.session.csrfToken;

    // 2. Safe HTTP methods do not require token verification
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Allow exempt webhook endpoints (e.g., payment webhooks)
    const exemptPaths = ["/checkout/verify-payment", "/webhook"];
    if (exemptPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    // Strictly enforce on /vendor and /admin routes
    const isProtectedArea =
        (req.baseUrl && (req.baseUrl.startsWith("/vendor") || req.baseUrl.startsWith("/admin"))) ||
        (req.path && (req.path.startsWith("/vendor") || req.path.startsWith("/admin"))) ||
        (req.originalUrl && (req.originalUrl.startsWith("/vendor") || req.originalUrl.startsWith("/admin")));
    if (!isProtectedArea) {
        return next();
    }

    // 3. Extract submitted token from body, query, or headers
    const submittedToken =
        (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        req.headers["x-csrf-token"] ||
        req.headers["csrf-token"] ||
        null;

    if (!submittedToken || typeof submittedToken !== "string") {
        console.warn(`⚠️ CSRF Violation: Missing token on ${req.method} ${req.originalUrl}`);
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "Invalid or missing CSRF token." });
        }
        req.flash("error", "Security check failed: Invalid or missing CSRF token. Please refresh and try again.");
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Action rejected: CSRF verification token is invalid or missing.",
            __: res.locals.__ || ((k) => k)
        });
    }

    const sessionBuffer = Buffer.from(req.session.csrfToken, "utf8");
    const submittedBuffer = Buffer.from(submittedToken, "utf8");

    if (sessionBuffer.length !== submittedBuffer.length || !crypto.timingSafeEqual(sessionBuffer, submittedBuffer)) {
        console.warn(`⚠️ CSRF Violation: Token mismatch on ${req.method} ${req.originalUrl}`);
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "CSRF token mismatch." });
        }
        req.flash("error", "Security check failed: CSRF token mismatch. Please try again.");
        return res.status(403).render("user/403", {
            title: "403 - Forbidden",
            message: "Action rejected: CSRF token verification failed.",
            __: res.locals.__ || ((k) => k)
        });
    }

    next();
}

module.exports = csrfProtection;
