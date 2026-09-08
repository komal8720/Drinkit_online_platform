const { pool } = require("../config/db");

async function migrateVendorColumns() {
    try {
        console.log("Checking vendor columns...");
        const [existing] = await pool.query(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors'"
        );
        const colNames = existing.map(r => r.COLUMN_NAME.toLowerCase());
        
        const toAdd = [
            { name: "address", def: "address TEXT NULL AFTER license_document" },
            { name: "city", def: "city VARCHAR(100) NULL AFTER address" },
            { name: "state", def: "state VARCHAR(100) NULL AFTER city" },
            { name: "pincode", def: "pincode VARCHAR(10) NULL AFTER state" },
            { name: "commission_rate", def: "commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 AFTER pincode" }
        ];

        for (const item of toAdd) {
            if (!colNames.includes(item.name.toLowerCase())) {
                await pool.query(`ALTER TABLE vendors ADD COLUMN ${item.def}`);
                console.log(`✅ Added column: ${item.name}`);
            } else {
                console.log(`ℹ️ Column already exists: ${item.name}`);
            }
        }

        console.log("Vendor columns migration complete.");
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrateVendorColumns();
