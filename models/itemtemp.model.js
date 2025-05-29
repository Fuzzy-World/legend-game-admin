const db = require('../config/db.config'); // 修改为正确路径

async function getTemplateItemById(id) {
  const [rows] = await db.execute('SELECT * FROM item_template WHERE item_id = ?', [id]);
  return rows[0];
}

// 获取所有模板物品
async function getAllTemplateItems() {
  try {
    // 统一使用 execute 方法
    const [rows] = await db.execute(`
      SELECT 
        item_id, 
        item_name AS name,
        type,
        rarity,
        base_attack AS attack,
        base_defense AS defense,
        req_level AS level,
        is_bind
      FROM item_template
    `);
    return rows;
  } catch (error) {
    console.error('获取模板物品失败:', error);
    throw new Error('数据库查询失败');
  }
}

// 创建模板物品（修改后）
async function createTemplateItem(itemData) {
  const validTypes = ['武器', '防具', '饰品', '消耗品'];
  if (!validTypes.includes(itemData.type)) {
    throw new Error('无效的物品类型');
  }
  const { item_name, type, rarity } = itemData;
  const [result] = await db.execute(
    'INSERT INTO item_template (item_name, type, rarity) VALUES (?, ?, ?)',
    [item_name, type, rarity]
  );
  return result.insertId;
}

// 更新模板物品（修改后）
async function updateTemplateItem(id, itemData, connection) {
  const validTypes = ['武器', '防具', '饰品', '消耗品'];
  if (itemData.type && !validTypes.includes(itemData.type)) {
    throw new Error('无效的物品类型');
  }
  
  const {
    item_name = '',    
    type = '',     
    rarity = 1
  } = itemData;
  
  const [result] = await (connection || db).execute(
    'UPDATE item_template SET item_name = ?, type = ?, rarity = ? WHERE item_id = ?', // 移除is_bind字段
    [item_name, type, rarity, id]
  );
  
  return result.affectedRows > 0;
}
async function deleteTemplateItem(id, connection) {
  const [result] = await (connection || db).execute(
    'DELETE FROM item_template WHERE item_id = ?',
    [id]
  );
  return result.affectedRows > 0;
}
module.exports = {
  getTemplateItemById,
  createTemplateItem,
  getAllTemplateItems,
  updateTemplateItem,
  deleteTemplateItem
};