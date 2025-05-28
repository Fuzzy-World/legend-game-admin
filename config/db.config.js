const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] 数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('[DB] 数据库连接失败:', err.stack); // 增强错误日志
    process.exit(1); // 连接失败时退出应用
  }
}

testConnection();

module.exports = pool; // 确认导出语句存在