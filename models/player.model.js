const db = require('../config/db.config');

// 获取所有玩家
async function getAllPlayers() {
  const [rows] = await db.execute(
    // 使用 DATE_FORMAT 格式化 create_time 为 YYYY-MM-DD HH:MM:SS
    'SELECT *, DATE_FORMAT(create_time, "%Y-%m-%d %H:%i:%s") AS create_time FROM account LIMIT 50',
    []
  );
  return rows;
}

// 根据ID获取玩家（修正后）
async function getPlayerById(id) {
  const [rows] = await db.execute(
    // 使用 DATE_FORMAT 格式化 create_time 为 YYYY-MM-DD HH:MM:SS
    'SELECT *, DATE_FORMAT(create_time, "%Y-%m-%d %H:%i:%s") AS create_time FROM account WHERE account_id = ?',
    [id]
  );
  return rows[0];
}

// 更新玩家信息（修正后）
async function updatePlayer(id, playerData) {
  const { email, phone, create_time, is_banned } = playerData;  // 不再解构 account_id
  const [result] = await db.execute(
    'UPDATE account SET email = ?, phone = ?, create_time = ?, is_banned = ? WHERE account_id = ?',  // 移除 account_id 更新
    [email, phone, create_time, is_banned, id]  // 调整参数顺序，仅传递非主键字段
  );
  return result.affectedRows > 0;
}

// 删除玩家
async function deletePlayer(id) {
  const [result] = await db.execute('DELETE FROM account WHERE account_id = ?', [id]);
  return result.affectedRows > 0;
}

// 创建新玩家（修正后）
async function createPlayer(playerData) {
  const { account_id, email, phone, create_time, is_banned } = playerData;  // 改为account_id
  const [result] = await db.execute(
    'INSERT INTO account (account_id, email, phone, create_time, is_banned) VALUES (?, ?, ?, ?, ?)',  // 修正占位符数量为5个
    [account_id, email, phone, create_time, is_banned]
  );
  return result.insertId;
}

// 检查电话号码是否已存在
async function checkPhoneExists(phone) {
  const [rows] = await db.execute('SELECT COUNT(*) AS count FROM account WHERE phone = ?', [phone]);
  return rows[0].count > 0;  // 返回 true 表示已存在
}

// 检查邮箱是否已存在
async function checkEmailExists(email) {
  const [rows] = await db.execute('SELECT COUNT(*) AS count FROM account WHERE email = ?', [email]);
  return rows[0].count > 0;  // 返回 true 表示已存在
}

module.exports = {
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  createPlayer,
  checkPhoneExists,
  checkEmailExists  // 新增导出方法
};
