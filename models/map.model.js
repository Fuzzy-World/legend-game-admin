const db = require('../config/db.config');

async function getAllMaps() {
  const [rows] = await db.execute('SELECT * FROM map_info');
  return rows;
}

async function getMapById(id) {
  const [rows] = await db.execute('SELECT * FROM map_info WHERE map_id = ?', [id]);
  return rows[0];
}

async function createMap(mapData) {
  try {
    const { spawn_config, ...rest } = mapData;
    const parsedConfig = JSON.parse(spawn_config);
    
    // 修改为数组参数格式
    const [result] = await db.execute(
      `INSERT INTO map_info 
      (map_name, map_type, is_safe_zone, unlock_level, icon_path, spawn_config) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rest.map_name,
        rest.map_type,
        rest.is_safe_zone,
        rest.unlock_level,
        rest.icon_path,
        JSON.stringify(parsedConfig)
      ]
    );
    return result.insertId;
  } catch (e) {
    throw new Error(`数据库操作失败: ${e.message}`);
  }
}

async function updateMap(id, mapData) {
  try {
    const { spawn_config, ...rest } = mapData;
    const parsedConfig = JSON.parse(spawn_config); // 解析JSON
    
    const [result] = await db.execute(
      `UPDATE map_info SET 
      map_name = ?, map_type = ?, is_safe_zone = ?, 
      spawn_config = ?, unlock_level = ?, icon_path = ?
      WHERE map_id = ?`,
      [
        rest.map_name,
        rest.map_type,
        rest.is_safe_zone,
        JSON.stringify(parsedConfig), // 存储标准化的JSON
        rest.unlock_level,
        rest.icon_path,
        id
      ]
    );
    return result.affectedRows > 0;
  } catch (e) {
    throw new Error(`数据库操作失败: ${e.message}`);
  }
}

async function deleteMap(id) {
  const [result] = await db.execute('DELETE FROM map_info WHERE map_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllMaps,
  getMapById,
  createMap,
  updateMap,
  deleteMap
};