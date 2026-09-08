require("dotenv").config();
const { pool } = require("../config/db");

async function runMigration() {
    console.log("\n=======================================================");
    console.log("   DRINKIT: RUNNING MULTI-VENDOR DATABASE MIGRATION   ");
    console.log("=======================================================\n");

    const connection = await pool.getConnection();

    try {
        // 1. Check if 'username' column exists in 'users' table
        console.log("1. Checking 'users' table for 'username' column...");
        const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'username'");
        if (userCols.length === 0) {
            console.log("   Adding 'username' column to 'users' table...");
            await connection.query("ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE NULL AFTER role_id");
            console.log("   ✓ 'username' column added to 'users'.");
        } else {
            console.log("   ✓ 'username' column already exists in 'users'.");
        }

        // 2. Check if 'status' column exists in 'vendors' table
        console.log("2. Checking 'vendors' table for 'status' column...");
        const [vendorCols] = await connection.query("SHOW COLUMNS FROM vendors LIKE 'status'");
        if (vendorCols.length === 0) {
            console.log("   Adding 'status' column to 'vendors' table...");
            await connection.query("ALTER TABLE vendors ADD COLUMN status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending' AFTER verification_status");
            // Set existing vendor to active
            await connection.query("UPDATE vendors SET status = 'active' WHERE id = 1");
            console.log("   ✓ 'status' column added to 'vendors' and existing vendor set to active.");
        } else {
            console.log("   ✓ 'status' column already exists in 'vendors'.");
        }

        // 3. Check / Create 'vendor_activation_tokens' table
        console.log("3. Checking 'vendor_activation_tokens' table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS vendor_activation_tokens (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                vendor_id BIGINT UNSIGNED NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_token_hash (token_hash),
                KEY idx_token_vendor (vendor_id),
                CONSTRAINT fk_token_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `);
        console.log("   ✓ 'vendor_activation_tokens' table is ready.");

        // 4. Ensure performance indexes on vendor-scoped tables
        console.log("4. Checking performance indexes...");

        // Helper to add index if not present
        async function ensureIndex(tableName, indexName, indexSql) {
            const [idxRows] = await connection.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [indexName]);
            if (idxRows.length === 0) {
                await connection.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${indexSql}`);
                console.log(`   ✓ Added index ${indexName} to ${tableName}.`);
            } else {
                console.log(`   ✓ Index ${indexName} on ${tableName} already exists.`);
            }
        }

        await ensureIndex("order_items", "idx_order_items_vendor", "(vendor_id)");
        await ensureIndex("products", "idx_products_vendor_status", "(vendor_id, status)");
        await ensureIndex("commissions", "idx_commissions_vendor", "(vendor_id)");
        await ensureIndex("notifications", "idx_notifications_user_read", "(user_id, is_read)");
        await ensureIndex("audit_logs", "idx_audit_logs_action", "(action)");

        console.log("\n=======================================================");
        console.log("   ✓ MULTI-VENDOR DATABASE MIGRATION COMPLETE         ");
        console.log("=======================================================\n");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    } finally {
        connection.release();
        pool.end();
    }
}

runMigration().catch(err => {
    console.error("Fatal migration error:", err);
    process.exit(1);
});
