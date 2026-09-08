// ==========================================================
// DRINKIT - RATE LIMITING MIDDLEWARE
// ==========================================================

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Window time in milliseconds
 * @param {number} options.max - Maximum allowed requests within window
 * @param {string} [options.message] - Custom message on limit exceeded
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests. Please try again later." }) {
    const hits = new Map();

    // Clean up stale entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of hits.entries()) {
            if (now - record.startTime > windowMs) {
                hits.delete(key);
            }
        }
    }, 5 * 60 * 1000).unref();

    return (req, res, next) => {
        const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown_ip";
        const key = `${ip}:${req.baseUrl || ""}${req.path}`;
        const now = Date.now();

        let record = hits.get(key);

        if (!record || now - record.startTime > windowMs) {
            record = { count: 1, startTime: now };
            hits.set(key, record);
            return next();
        }

        record.count++;

        if (record.count > max) {
            console.warn(`🛑 Rate limit exceeded for IP ${ip} on ${req.originalUrl}`);
            const retryAfterSec = Math.ceil((windowMs - (now - record.startTime)) / 1000);
            res.set("Retry-After", String(retryAfterSec));

            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.status(429).json({
                    success: false,
                    message,
                    retryAfter: retryAfterSec
                });
            }

            req.flash("error", `${message} (Retry in ${retryAfterSec}s)`);
            return res.status(429).render("user/403", {
                title: "429 - Too Many Requests",
                message: `${message} Please wait ${retryAfterSec} seconds before trying again.`,
                __: res.locals.__ || ((k) => k)
            });
        }

        next();
    };
}

// Pre-configured rate limiters for critical endpoints (5 attempts per 15 min window)
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts from this IP address."
});

const activationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many activation attempts."
});

const invitationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many invitation resend requests."
});

module.exports = {
    createRateLimiter,
    authLimiter,
    activationLimiter,
    invitationLimiter
};
