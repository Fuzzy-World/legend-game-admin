// db.config.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 终极调试：捕获所有回调调用
const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = function(...args) {
  // 检查是否以回调方式调用
  if (args.length > 0 && typeof args[0] === 'function') {
    const cb = args[0];
    // 替换回调函数以打印调用栈
    args[0] = function(err, connection) {
      console.error('[FATAL] 检测到回调风格调用，栈跟踪：');
      console.error(new Error().stack);
      cb(err, connection);
    };
  }
  return originalGetConnection.apply(pool, args);
};

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] 数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('[DB] 数据库连接失败:', err.stack);
    process.exit(1);
  }
}
testConnection();

module.exports = pool;