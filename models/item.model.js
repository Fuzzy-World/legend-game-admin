const db = require('../config/db.config'); // 修改为正确路径

// 获取所有物品
// 新增获取所有物品的方法
async function getAllItems() {
  const [rows] = await db.execute(`
    SELECT item_id AS item_id, name 
    FROM items
    ORDER BY name ASC
  `);
  return rows;
}

// 根据ID获取物品
async function getItemById(id) {
  const [rows] = await db.execute('SELECT * FROM auction_item WHERE id = ?', [id]);
  return rows[0];
}

// 更新物品信息
async function updateItem(id, itemData) {
  const { name, type, level, attack, defense, price } = itemData;
  const [result] = await db.execute(
    'UPDATE items SET name = ?, type = ?, level = ?, attack = ?, defense = ?, price = ? WHERE id = ?',
    [name, type, level, attack, defense, price, id]
  );
  return result.affectedRows > 0;
}

// 删除物品
async function deleteItem(id) {
  const [result] = await db.execute('DELETE FROM items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// 创建新物品
async function createItem(itemData) {
  const { name, type, level, attack, defense, price } = itemData;
  const [result] = await db.execute(
    'INSERT INTO items (name, type, level, attack, defense, price, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [name, type, level, attack, defense, price]
  );
  return result.insertId;
}

// 获取所有模板物品的方法（重命名避免冲突）
const getAllTemplateItems = async () => {
  try {
    // 修正表名和字段映射
    const [rows] = await db.query(`
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
    throw new Error('数据库查询失败');
  }
};

// 新增创建模板物品的方法
async function createTemplateItem(itemData) {
  const { item_name, type, rarity } = itemData;
  const [result] = await db.execute(
    'INSERT INTO item_template (item_name, type, rarity) VALUES (?, ?, ?)',
    [item_name, type, rarity]
  );
  return result.insertId;
}

module.exports = {
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  createItem,
  createTemplateItem,
  getAllTemplateItems // 确保导出名称匹配
};
