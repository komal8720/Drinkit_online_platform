// ==========================================================
// DRINKIT - AUDIT LOG SERVICE
// ==========================================================

const { pool } = require("../config/db");

/**
 * Records an audit log entry.
 * @param {Object} options
 * @param {number|null} options.userId - User performing or affected by action
 * @param {string} options.action - Short uppercase identifier (e.g., 'VENDOR_CREATED')
 * @param {string} [options.module='VENDOR'] - System module ('VENDOR', 'ADMIN', 'PRODUCT', 'ORDER')
 * @param {string} options.description - Human-readable summary of the action
 * @param {Object} [options.req] - Express request object for IP and User-Agent extraction
 * @param {Object} [options.connection] - Optional existing transaction connection
 * @returns {Promise<number|null>} Inserted audit log ID
 */
async function logAudit({ userId = null, action, module = "VENDOR", description, req = null, connection = null }) {
    try {
        let ipAddress = null;
        let userAgent = null;

        if (req) {
            ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
            if (typeof ipAddress === "string" && ipAddress.includes(",")) {
                ipAddress = ipAddress.split(",")[0].trim();
            }
            userAgent = req.headers["user-agent"] || null;
            if (userAgent && userAgent.length > 500) {
                userAgent = userAgent.substring(0, 500);
            }
        }

        const executor = connection || pool;
        const [result] = await executor.query(
            `INSERT INTO audit_logs (user_id, action, module, description, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, action, module, description, ipAddress, userAgent]
        );

        return result.insertId;
    } catch (err) {
        console.error("❌ Failed to record audit log:", err.message);
        // Do not crash the parent flow if audit logging fails
        return null;
    }
}

module.exports = {
    logAudit
};
