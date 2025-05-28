const db = require('../config/db.config');

// 获取所有物品
async function getAllItems() {
  const [rows] = await db.execute('SELECT * FROM items LIMIT 50');
  return rows;
}

// 根据ID获取物品
async function getItemById(id) {
  const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
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

module.exports = {
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  createItem
};    