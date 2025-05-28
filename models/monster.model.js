const { pool, getConnection } = require('../config/db.config');

// 获取所有怪物
async function getAllMonsters() {
  try {
    const [rows] = await pool.execute(`
      SELECT mt.*, mi.map_name, dt.drop_table_name 
      FROM monster_template mt
      LEFT JOIN map_info mi ON mt.map_id = mi.map_id
      LEFT JOIN drop_table dt ON mt.drop_table_id = dt.drop_table_id
    `);
    return rows;
  } catch (error) {
    console.error('获取怪物列表失败:', error);
    throw error;
  }
}

// 根据ID获取怪物
async function getMonsterById(id) {
  try {
    const [rows] = await pool.execute('SELECT * FROM monster_template WHERE monster_id = ?', [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('获取怪物详情失败:', error);
    throw error;
  }
}

// 创建怪物
async function createMonster(monsterData) {
  try {
    console.log('[MONSTER] 开始创建怪物，参数：', monsterData);
    
    // 定义允许的字段和默认值
    const allowedFields = {
      monster_name: monsterData.monster_name,
      monster_type: monsterData.monster_type,
      level: parseInt(monsterData.level) || 1,
      hp_max: parseInt(monsterData.hp_max) || 100,
      attack: parseInt(monsterData.attack) || 10,
      defense: parseInt(monsterData.defense) || 5,
      map_id: parseInt(monsterData.map_id),
      drop_table_id: parseInt(monsterData.drop_table_id),
      move_speed: parseInt(monsterData.move_speed) || 1,
      created_at: new Date()
    };
    
    // 验证必填字段
    if (!allowedFields.monster_name || !allowedFields.monster_type || 
        !allowedFields.map_id || !allowedFields.drop_table_id) {
      throw new Error('怪物名称、类型、地图和掉落表为必填字段');
    }
    
    const [result] = await pool.execute(
      'INSERT INTO monster_template SET ?', 
      allowedFields
    );
    
    console.log('[MONSTER] 怪物创建成功，ID：', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('[MONSTER] 怪物创建失败，参数：', monsterData, '错误详情：', error.stack);
    throw error;
  }
}

// 更新怪物
async function updateMonster(id, monsterData) {
  try {
    console.log('[MONSTER] 开始更新怪物，ID：', id, '参数：', monsterData);
    
    // 定义允许更新的字段
    const allowedFields = [
      'monster_name', 'monster_type', 'level', 'hp_max', 
      'attack', 'defense', 'map_id', 'drop_table_id', 'move_speed'
    ];
    
    const updateData = {};
    Object.keys(monsterData).forEach(key => {
      if (allowedFields.includes(key)) {
        // 数值字段转换
        if (['level', 'hp_max', 'attack', 'defense', 'move_speed'].includes(key)) {
          updateData[key] = parseInt(monsterData[key]);
          if (isNaN(updateData[key])) {
            throw new Error(`${key} 必须为有效数字`);
          }
        } else {
          updateData[key] = monsterData[key];
        }
      }
    });
    
    // 检查是否有可更新的数据
    if (Object.keys(updateData).length === 0) {
      console.log('[MONSTER] 没有可更新的字段');
      return false;
    }
    
    const [result] = await pool.execute(
      'UPDATE monster_template SET ? WHERE monster_id = ?', 
      [updateData, id]
    );
    
    console.log('[MONSTER] 怪物更新结果：', result);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('[MONSTER] 怪物更新失败，ID：', id, '错误详情：', error.stack);
    throw error;
  }
}

// 删除怪物
async function deleteMonster(id) {
  try {
    console.log('[MONSTER] 开始删除怪物，ID：', id);
    
    const [result] = await pool.execute(
      'DELETE FROM monster_template WHERE monster_id = ?', 
      [id]
    );
    
    console.log('[MONSTER] 怪物删除结果：', result);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('[MONSTER] 怪物删除失败，ID：', id, '错误详情：', error.stack);
    throw error;
  }
}

// 检查地图是否存在
async function checkMapExists(mapId) {
  try {
    const [rows] = await pool.execute('SELECT map_id FROM map_info WHERE map_id = ?', [mapId]);
    return rows.length > 0;
  } catch (error) {
    console.error('检查地图存在失败:', error);
    throw error;
  }
}

// 检查掉落表是否存在
async function checkDropTableExists(dropTableId) {
  try {
    const [rows] = await pool.execute('SELECT drop_table_id FROM drop_table WHERE drop_table_id = ?', [dropTableId]);
    return rows.length > 0;
  } catch (error) {
    console.error('检查掉落表存在失败:', error);
    throw error;
  }
}

// 获取所有地图
async function getAllMaps() {
  try {
    const [rows] = await pool.execute('SELECT map_id, map_name FROM map_info');
    return rows;
  } catch (error) {
    console.error('获取地图列表失败:', error);
    throw error;
  }
}

// 获取所有掉落表
async function getAllDropTables() {
  try {
    const [rows] = await pool.execute('SELECT drop_table_id, drop_table_name FROM drop_table');
    return rows;
  } catch (error) {
    console.error('获取掉落表列表失败:', error);
    throw error;
  }
}

module.exports = {
  getAllMonsters,
  getMonsterById,
  createMonster,
  updateMonster,
  deleteMonster,
  checkMapExists,
  checkDropTableExists,
  getAllMaps,
  getAllDropTables
};