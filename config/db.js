const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "drinkit",
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    charset: "utf8mb4"
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("✅ MySQL Database Connected Successfully");

        connection.release();
    } catch (error) {
        console.error("❌ MySQL Database Connection Failed");
        console.error("Error:", error.message);
    }
}

module.exports = {
    pool,
    testConnection
};