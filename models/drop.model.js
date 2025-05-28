const db = require('../config/db.config');

// 获取所有掉落表记录
const getAllDropsWithItems = async () => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, i.item_name, i.type, i.rarity
      FROM drop_table d
      JOIN item_template i ON d.item_id = i.item_id  -- 已关联item_template表
      ORDER BY d.drop_table_id ASC
    `);
    return rows;
  } catch (error) {
    throw new Error('数据库查询失败');
  }
};

// 根据ID获取掉落记录
async function getDropById(id) {
  const [rows] = await db.query(`
    SELECT d.*, i.type, i.rarity 
    FROM drop_table d 
    JOIN item_template i ON d.item_id = i.item_id 
    WHERE d.drop_table_id = ?
  `, [id]);
  return rows[0];
}

// 创建掉落记录
async function createDrop(dropData) {
  const { item_id, drop_rate, is_bind } = dropData;
  const [result] = await db.execute(
    'INSERT INTO drop_table (item_id, drop_rate, is_bind) VALUES (?, ?, ?)',  // 使用item_id
    [item_id, drop_rate, is_bind]
  );
  return result.insertId;
}

// 更新掉落记录
async function updateDrop(id, dropData) {
  const { item_id, drop_rate, is_bind } = dropData;
  const [result] = await db.execute(
    'UPDATE drop_table SET item_id = ?, drop_rate = ?, is_bind = ? WHERE drop_table_id = ?',
    [item_id, drop_rate, is_bind, id]
  );
  return result.affectedRows > 0;
}

// 删除掉落记录（修改后）
async function deleteDrop(id) {
  const connection = await db.getConnection(); // 获取独立连接用于事务
  try {
    await connection.beginTransaction(); // 开启事务

    // 步骤1：查询当前掉落记录的 item_id
    const [dropRows] = await connection.query(
      'SELECT item_id FROM drop_table WHERE drop_table_id = ?',
      [id]
    );
    if (dropRows.length === 0) {
      await connection.rollback(); // 无记录则回滚
      return false;
    }
    const { item_id } = dropRows[0];

    // 步骤2：删除 drop_table 中的记录
    const [dropResult] = await connection.execute(
      'DELETE FROM drop_table WHERE drop_table_id = ?',
      [id]
    );
    if (dropResult.affectedRows === 0) {
      await connection.rollback(); // 删除失败则回滚
      return false;
    }

    // 步骤3：删除 item_template 中的关联记录
    const [itemResult] = await connection.execute(
      'DELETE FROM item_template WHERE item_id = ?',
      [item_id]
    );
    if (itemResult.affectedRows === 0) {
      await connection.rollback(); // 删除失败则回滚
      return false;
    }

    await connection.commit(); // 所有操作成功，提交事务
    return true;
  } catch (error) {
    await connection.rollback(); // 异常时回滚
    throw new Error(`删除失败：${error.message}`);
  } finally {
    connection.release(); // 释放连接
  }
}

module.exports = {
  getAllDropsWithItems,  // Fix: Use the actual function name that exists
  getDropById,
  createDrop,
  updateDrop,
  deleteDrop
};