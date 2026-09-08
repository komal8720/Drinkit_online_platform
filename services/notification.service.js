// ==========================================================
// DRINKIT - NOTIFICATION SERVICE
// ==========================================================

const { pool } = require("../config/db");

/**
 * Creates a notification for a specific user.
 * @param {Object} options
 * @param {number} options.userId - Recipient user ID
 * @param {string} options.title - Short notification title
 * @param {string} options.message - Detailed notification message
 * @param {string} [options.type='info'] - 'info', 'order', 'product', 'vendor', 'warning'
 * @param {Object} [options.connection] - Optional existing transaction connection
 */
async function createNotification({ userId, title, message, type = "info", connection = null }) {
    try {
        const executor = connection || pool;
        const [result] = await executor.query(
            `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
             VALUES (?, ?, ?, ?, 0, NOW())`,
            [userId, title, message, type]
        );
        return result.insertId;
    } catch (err) {
        console.error("❌ Failed to create notification:", err.message);
        return null;
    }
}

/**
 * Gets count of unread notifications for a user.
 */
async function getUnreadCount(userId) {
    try {
        const [rows] = await pool.query(
            "SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0",
            [userId]
        );
        return rows[0].unreadCount || 0;
    } catch (err) {
        console.error("❌ Error fetching unread notification count:", err.message);
        return 0;
    }
}

/**
 * Fetches notifications for a user with pagination.
 */
async function getNotifications(userId, limit = 20, offset = 0) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [userId, limit, offset]
        );
        return rows;
    } catch (err) {
        console.error("❌ Error fetching notifications:", err.message);
        return [];
    }
}

/**
 * Marks a single notification as read, ensuring it belongs to the user.
 */
async function markAsRead(notificationId, userId) {
    try {
        const [result] = await pool.query(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
            [notificationId, userId]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error("❌ Error marking notification as read:", err.message);
        return false;
    }
}

/**
 * Marks all unread notifications as read for a user.
 */
async function markAllAsRead(userId) {
    try {
        const [result] = await pool.query(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            [userId]
        );
        return result.affectedRows;
    } catch (err) {
        console.error("❌ Error marking all notifications as read:", err.message);
        return 0;
    }
}

module.exports = {
    createNotification,
    getUnreadCount,
    getNotifications,
    markAsRead,
    markAllAsRead
};
