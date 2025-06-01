const pool = require('../config/db.config');

// 怪物模板模型
class MonsterTemplate {
  // 获取所有怪物（修改后）
  static async getAllMonsters() {
    try {
      const [rows] = await pool.execute(`
        SELECT * FROM v_monster_drop_details ;
      `);
      return rows || [];
    } catch (error) {
      console.error('获取怪物列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取怪物
  static async getMonsterById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT mt.*, mi.map_name
        FROM monster_template mt
        LEFT JOIN map_info mi ON mt.map_id = mi.map_id
        LEFT JOIN drop_table dt ON mt.drop_table_id = dt.drop_table_id
        WHERE mt.monster_id = ?
      `, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('获取怪物详情失败:', error);
      throw error;
    }
  }

  // 创建怪物
  static async createMonster(monsterData) {
    try {
      // 验证和处理数据
      const validatedData = {
        monster_name: monsterData.monster_name,
        monster_type: monsterData.monster_type,
        level: parseInt(monsterData.level) || 1,
        hp_max: parseInt(monsterData.hp_max) || 100,
        attack: parseInt(monsterData.attack) || 10,
        defense: parseInt(monsterData.defense) || 5,
        map_id: parseInt(monsterData.map_id),
        drop_table_id: parseInt(monsterData.drop_table_id),
        move_speed: parseInt(monsterData.move_speed) || 1
      };

      // 验证必填字段
      if (!validatedData.monster_name || !validatedData.monster_type || 
          !validatedData.map_id || !validatedData.drop_table_id) {
        throw new Error('怪物名称、类型、地图和掉落表为必填字段');
      }

      // 验证约束条件
      if (validatedData.level < 1 || validatedData.level > 100) {
        throw new Error('怪物等级必须在1-100之间');
      }
      if (validatedData.move_speed < 1 || validatedData.move_speed > 5) {
        throw new Error('移动速度必须在1-5之间');
      }

      // 新增：验证地图是否存在
      const mapExists = await MonsterTemplate.checkMapExists(validatedData.map_id);
      if (!mapExists) {
        throw new Error('所选地图不存在');
      }

      // 新增：验证掉落表是否存在
      const dropTableExists = await MonsterTemplate.checkDropTableExists(validatedData.drop_table_id);
      if (!dropTableExists) {
        throw new Error('所选掉落表不存在');
      }

      // 修改插入语句为显式字段列表 + 数组参数形式
      const [result] = await pool.execute(
        'INSERT INTO monster_template (monster_name, monster_type, level, hp_max, attack, defense, map_id, drop_table_id, move_speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          validatedData.monster_name,
          validatedData.monster_type,
          validatedData.level,
          validatedData.hp_max,
          validatedData.attack,
          validatedData.defense,
          validatedData.map_id,
          validatedData.drop_table_id,
          validatedData.move_speed
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建怪物失败:', error);
      throw error;
    }
  }

  // 更新怪物
  static async updateMonster(id, monsterData) {
    try {
      const allowedFields = [
        'monster_name', 'monster_type', 'level', 'hp_max',
        'attack', 'defense', 'map_id', 'drop_table_id', 'move_speed'
      ];
      
      const updateData = {};
      allowedFields.forEach(field => {
        if (monsterData[field] !== undefined) {
          updateData[field] = monsterData[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw new Error('没有可更新的字段');
      }

      // 动态构建SET子句（原错误点）
      const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData).concat(id);
      
      const [result] = await pool.execute(
        `UPDATE monster_template SET ${setClause} WHERE monster_id = ?`,
        values
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新怪物失败:', error);
      throw error;
    }
  }

  // 删除怪物
  static async deleteMonster(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM monster_template WHERE monster_id = ?', 
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除怪物失败:', error);
      throw error;
    }
  }

  // 检查地图是否存在
  static async checkMapExists(mapId) {
    try {
      const [rows] = await pool.execute('SELECT map_id FROM map_info WHERE map_id = ?', [mapId]);
      return rows.length > 0;
    } catch (error) {
      console.error('检查地图存在失败:', error);
      throw error;
    }
  }

  // 检查掉落表是否存在
  static async checkDropTableExists(dropTableId) {
    try {
      const [rows] = await pool.execute('SELECT drop_table_id FROM drop_table WHERE drop_table_id = ?', [dropTableId]);
      return rows.length > 0;
    } catch (error) {
      console.error('检查掉落表存在失败:', error);
      throw error;
    }
  }
}

module.exports = MonsterTemplate;