const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,   // adjust based on server load
  queueLimit: 0
});

// Test the connection once at startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ DB Connection Failed:', err.stack);
  } else {
    console.log('✅ Connected to MySQL DB (Pool)');
    connection.release();
  }
});

module.exports = db;
