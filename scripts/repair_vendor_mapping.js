require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const ROLES = require("../config/roles");

async function repairVendorMapping() {
    console.log("\n=======================================================");
    console.log("   DRINKIT: SAFE VENDOR-USER DATABASE MAPPING REPAIR   ");
    console.log("=======================================================\n");

    const connection = await pool.getConnection();

    try {
        console.log("1. Initiating MySQL Transaction...");
        await connection.beginTransaction();

        // 2. Fetch and lock existing vendor record
        console.log("2. Inspecting vendor record id = 1...");
        const [vendors] = await connection.query(
            "SELECT * FROM vendors WHERE id = 1 FOR UPDATE"
        );

        if (vendors.length === 0) {
            throw new Error("Vendor with id = 1 not found in database.");
        }

        const vendor = vendors[0];
        console.log(`   Found Vendor #${vendor.id}: "${vendor.business_name}" (Owner: ${vendor.owner_name})`);
        console.log(`   Current vendors.user_id = ${vendor.user_id}`);

        // 3. Inspect the currently linked user
        const [linkedUsers] = await connection.query(
            "SELECT id, role_id, first_name, last_name, email, mobile FROM users WHERE id = ?",
            [vendor.user_id]
        );

        if (linkedUsers.length === 0) {
            console.log("   Warning: Current vendors.user_id does not exist in users table.");
        } else {
            const linkedUser = linkedUsers[0];
            console.log(`   Linked User: #${linkedUser.id} (${linkedUser.email}), role_id = ${linkedUser.role_id}`);

            if (linkedUser.role_id === ROLES.VENDOR) {
                console.log("   ✓ Vendor is already correctly mapped to a user with role_id = 2 (VENDOR).");
                console.log("   No changes needed. Rolling back transaction.");
                await connection.rollback();
                connection.release();
                pool.end();
                return;
            }

            if (linkedUser.role_id === ROLES.SUPER_ADMIN) {
                console.log("   ⚠️ INVALID MAPPING CONFIRMED: vendors.user_id points to SUPER_ADMIN!");
            } else {
                console.log(`   ⚠️ INVALID MAPPING: vendors.user_id points to non-vendor role (${linkedUser.role_id}).`);
            }
        }

        // 4. Determine dedicated vendor user
        const vendorEmail = (vendor.business_email || "shop@drinkit.com").trim().toLowerCase();
        let targetVendorUserId = null;

        // Check if a dedicated user with this vendor email already exists
        const [existingVendorUsers] = await connection.query(
            "SELECT id, role_id, email FROM users WHERE email = ?",
            [vendorEmail]
        );

        if (existingVendorUsers.length > 0) {
            const existingUser = existingVendorUsers[0];
            if (existingUser.role_id === ROLES.VENDOR) {
                console.log(`4. Found existing VENDOR user for email "${vendorEmail}": User #${existingUser.id}.`);
                targetVendorUserId = existingUser.id;
            } else {
                throw new Error(`User with email "${vendorEmail}" already exists but has non-vendor role (${existingUser.role_id}).`);
            }
        } else {
            console.log(`4. Creating new dedicated VENDOR user for "${vendorEmail}"...`);

            // Derive names from vendor.owner_name
            let firstName = "Test";
            let lastName = "Vendor";
            if (vendor.owner_name && vendor.owner_name.trim()) {
                const parts = vendor.owner_name.trim().split(/\s+/);
                firstName = parts[0];
                lastName = parts.slice(1).join(" ") || null;
            }

            // Generate cryptographically secure initial password hash
            // This ensures no plain-text password exists and admin password is never copied
            const randomSecret = crypto.randomBytes(32).toString("hex");
            const securePasswordHash = await bcrypt.hash(randomSecret, 10);

            // Note: users.mobile has a UNIQUE constraint.
            // Since User #1 (Super Admin) currently holds mobile '9876543210',
            // we leave users.mobile as NULL for the vendor user to prevent a duplicate key violation.
            // The vendor's business mobile ('9876543210') is fully preserved in vendors.business_mobile.
            const [insertResult] = await connection.query(
                `INSERT INTO users (
                    role_id, first_name, last_name, email, mobile, password_hash, status, email_verified_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
                [
                    ROLES.VENDOR,
                    firstName,
                    lastName,
                    vendorEmail,
                    null,
                    securePasswordHash
                ]
            );

            targetVendorUserId = insertResult.insertId;
            console.log(`   ✓ Dedicated VENDOR user created with ID: #${targetVendorUserId} (role_id = ${ROLES.VENDOR})`);
        }

        // 5. Update vendors.user_id
        console.log(`5. Reassigning vendors.user_id -> ${targetVendorUserId}...`);
        const [updateResult] = await connection.query(
            "UPDATE vendors SET user_id = ?, updated_at = NOW() WHERE id = ?",
            [targetVendorUserId, vendor.id]
        );

        if (updateResult.affectedRows !== 1) {
            throw new Error(`Failed to update vendor. Affected rows: ${updateResult.affectedRows}`);
        }
        console.log(`   ✓ Vendor #${vendor.id} successfully updated with user_id = ${targetVendorUserId}.`);

        // 6. Record Audit Log
        console.log("6. Writing to audit_logs...");
        await connection.query(
            `INSERT INTO audit_logs (user_id, action, module, description, created_at)
             VALUES (?, 'VENDOR_USER_MAPPING_REPAIRED', 'VENDOR', ?, NOW())`,
            [
                1, // Performed by SUPER_ADMIN (User #1)
                `Vendor #${vendor.id} (${vendor.business_name}) was incorrectly linked to SUPER_ADMIN (user_id: 1) and was reassigned to dedicated vendor user (user_id: ${targetVendorUserId}).`
            ]
        );
        console.log("   ✓ Audit log entry recorded.");

        // 7. Verify relationship before commit
        console.log("7. Verifying relationship in transaction...");
        const [verifyRows] = await connection.query(`
            SELECT
                v.id AS vendor_id,
                v.business_name,
                v.user_id,
                u.id AS linked_user_id,
                u.email,
                u.role_id
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [vendor.id]);

        if (verifyRows.length === 0) {
            throw new Error("Verification failed: Vendor join user returned no rows.");
        }

        const row = verifyRows[0];
        console.log(`   Verification: Vendor #${row.vendor_id} -> User #${row.linked_user_id} (${row.email}), role_id = ${row.role_id}`);

        if (row.role_id !== ROLES.VENDOR) {
            throw new Error(`Verification failed: linked user has role_id = ${row.role_id}, expected ${ROLES.VENDOR}.`);
        }

        // Verify Super Admin remains untouched
        const [adminRows] = await connection.query(
            "SELECT id, role_id, email FROM users WHERE id = 1"
        );
        if (adminRows.length === 0 || adminRows[0].role_id !== ROLES.SUPER_ADMIN) {
            throw new Error("Verification failed: Super Admin user id = 1 was altered!");
        }
        console.log(`   ✓ Super Admin user #1 verified: role_id = ${adminRows[0].role_id} (SUPER_ADMIN)`);

        // 8. Commit Transaction
        console.log("8. Committing transaction...");
        await connection.commit();
        console.log("\n=======================================================");
        console.log("   ✓ SUCCESS: VENDOR-USER MAPPING REPAIR COMMITTED     ");
        console.log("=======================================================\n");

    } catch (error) {
        console.error("\n❌ Transaction failed. Executing ROLLBACK...", error.message);
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        pool.end();
    }
}

repairVendorMapping().catch((err) => {
    console.error("Migration script aborted:", err);
    process.exit(1);
});
