const db = require('../config/db.config'); // 修改为正确路径

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
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 更新账户表
    const { email, phone, create_time, is_banned } = playerData;
    const [result] = await connection.execute(
      'UPDATE account SET email = ?, phone = ?, create_time = ?, is_banned = ? WHERE account_id = ?',
      [email, phone, create_time, is_banned, id]
    );

    // 新增拍卖行物品更新（使用事务连接）
    if (playerData.item_inst_id) {
      await connection.execute(
        'UPDATE auction_item SET seller_id = ? WHERE item_inst_id = ?',
        [id, playerData.item_inst_id]
      );
    }

    // 修正角色更新（使用事务连接）
    if (playerData.char_id) {
      await connection.execute(
        'UPDATE `character` SET account_id = ? WHERE char_id = ?',
        [id, playerData.char_id]
      );
    }

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 删除玩家
async function deletePlayer(id) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 先删除拍卖行记录（新增）
    await connection.execute(
      'DELETE FROM auction_item WHERE item_inst_id IN (SELECT item_inst_id FROM player_item WHERE char_id IN (SELECT char_id FROM `character` WHERE account_id = ?))',
      [id]
    );

    // 然后删除玩家物品
    await connection.execute(
      'DELETE FROM player_item WHERE char_id IN (SELECT char_id FROM `character` WHERE account_id = ?)',
      [id]
    );

    // 删除角色
    await connection.execute(
      'DELETE FROM `character` WHERE account_id = ?',
      [id]
    );

    // 最后删除账户
    const [result] = await connection.execute(
      'DELETE FROM account WHERE account_id = ?', 
      [id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

async function updateUserProfile(id, userData) {
  const allowedFields = ['email', 'phone'];
  const updateData = {};
  
  allowedFields.forEach(field => {
    if (userData[field] !== undefined) {
      updateData[field] = userData[field];
    }
  });

  const [result] = await db.execute(
    'UPDATE account SET ? WHERE account_id = ?',
    [updateData, id]
  );
  return result.affectedRows > 0;
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
