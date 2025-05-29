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
    SELECT d.*, 
           i.item_name,  -- 添加item_name字段
           i.type,
           i.rarity 
    FROM drop_table d 
    JOIN item_template i ON d.item_id = i.item_id 
    WHERE d.drop_table_id = ?`, 
    [id]
  );
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
async function updateDrop(id, dropData, connection) {
  const { 
    drop_rate = 0.1,
    is_bind = 0  // 新增is_bind参数
  } = dropData;
  const [result] = await (connection || db).execute(
    'UPDATE drop_table SET drop_rate = ?, is_bind = ? WHERE drop_table_id = ?',
    [drop_rate, is_bind, id]
  );
  return result.affectedRows > 0;
}

// 删除掉落记录及关联的物品模板（优化后）
async function deleteDrop(id) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 新增：检查关联的item_template是否存在
    const [itemCheck] = await connection.execute(
      'SELECT item_id FROM drop_table WHERE drop_table_id = ?',
      [id]
    );
    if (itemCheck.length === 0) {
      throw new Error('找不到对应的掉落记录');
    }

    // 修改删除顺序
    
    
    const [deleteDropResult] = await connection.execute(
      'DELETE FROM drop_table WHERE drop_table_id = ?',
      [id]
    );
    await connection.execute(
      'DELETE FROM item_template WHERE item_id = ?',
      [itemCheck[0].item_id]
    );
    if (deleteDropResult.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('删除操作失败:', error);
    throw new Error(`删除失败：${error.message}`);
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllDropsWithItems,  // Fix: Use the actual function name that exists
  getDropById,
  createDrop,
  updateDrop,
  deleteDrop
};
