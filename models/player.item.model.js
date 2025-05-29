const pool = require('../config/db.config');

class PlayerItem {
  // 获取所有玩家物品实例（关联角色和物品模板）
  static async getAllPlayerItems() {
    try {
      const [rows] = await pool.execute(`
        SELECT pi.*, c.char_name, c.account_id, it.item_name 
        FROM player_item pi
        LEFT JOIN \`character\` c ON pi.char_id = c.char_id
        LEFT JOIN item_template it ON pi.item_id = it.item_id
      `);
      return rows || [];
    } catch (error) {
      console.error('获取玩家物品列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取单个物品实例（修改查询字段）
  static async getPlayerItemById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT pi.*, c.char_name, c.account_id, it.item_name 
        FROM player_item pi
        LEFT JOIN \`character\` c ON pi.char_id = c.char_id
        LEFT JOIN item_template it ON pi.item_id = it.item_id
        WHERE pi.item_inst_id = ?
      `, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('获取物品详情失败:', error);
      throw error;
    }
  }

  // 创建新物品实例（修正is_equipped处理）
  static async createPlayerItem(itemData) {
    try {
      const validatedData = {
        char_id: parseInt(itemData.char_id),
        item_id: parseInt(itemData.item_id),
        count: parseInt(itemData.count) || 1,
        is_equipped: itemData.is_equipped === '1' ? 1 : 0, // 关键修正
        enhance_level: parseInt(itemData.enhance_level) || 0
      };

      // 验证必填字段
      if (!validatedData.char_id || !validatedData.item_id) {
        throw new Error('角色ID和物品ID为必填字段');
      }

      const [result] = await pool.execute(
        'INSERT INTO player_item (char_id, item_id, count, is_equipped, enhance_level) VALUES (?, ?, ?, ?, ?)',
        [
          validatedData.char_id,
          validatedData.item_id,
          validatedData.count,
          validatedData.is_equipped,
          validatedData.enhance_level
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建物品实例失败:', error);
      throw error;
    }
  }

  static async updatePlayerItem(id, itemData) {
    try {
      console.log('接收更新数据:', itemData);
      
      // 验证ID有效性
      if (!id || isNaN(id)) {
        throw new Error('无效的物品实例ID');
      }
      
      const allowedFields = ['char_id', 'item_id', 'count', 'is_equipped', 'enhance_level'];
      const updateData = {};
      
      // 处理各字段更新
      allowedFields.forEach(field => {
        if (itemData[field] !== undefined) {
          if (field === 'char_id' || field === 'item_id') {
            const num = parseInt(itemData[field]);
            if (isNaN(num) || num <= 0) {
              throw new Error(`${field}必须是正整数`);
            }
            updateData[field] = num;
          } else if (field === 'count') {
            const num = parseInt(itemData[field]);
            if (isNaN(num) || num < 1) {
              throw new Error('数量必须是大于等于1的整数');
            }
            updateData[field] = num;
          } else if (field === 'enhance_level') {
            const num = parseInt(itemData[field]);
            if (isNaN(num) || num < 0) {
              throw new Error('强化等级不能为负数');
            }
            updateData[field] = num;
          }
        }
      });
      
      // 处理is_equipped字段（关键修改）
      if (itemData.is_equipped !== undefined) {
        // 将数组转换为单个值（取最后一个元素）
        const equippedValue = Array.isArray(itemData.is_equipped) 
          ? itemData.is_equipped[itemData.is_equipped.length - 1] 
          : itemData.is_equipped;
        
        updateData.is_equipped = equippedValue === '1' ? 1 : 0;
      } else {
        updateData.is_equipped = 0;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('没有可更新的字段');
      }

      // 检查外键有效性
      if (updateData.char_id) {
        const [charResult] = await pool.execute(
          'SELECT char_id FROM `character` WHERE char_id = ?', 
          [updateData.char_id]
        );
        if (charResult.length === 0) {
          throw new Error(`角色ID ${updateData.char_id} 不存在`);
        }
      }
      
      if (updateData.item_id) {
        const [itemResult] = await pool.execute(
          'SELECT item_id FROM item_template WHERE item_id = ?', 
          [updateData.item_id]
        );
        if (itemResult.length === 0) {
          throw new Error(`物品模板ID ${updateData.item_id} 不存在`);
        }
      }

      const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData).concat(id);
      
      console.log('执行更新SQL:', `UPDATE player_item SET ${setClause} WHERE item_inst_id = ?`);
      console.log('参数值:', values);
      
      const [result] = await pool.execute(
        `UPDATE player_item SET ${setClause} WHERE item_inst_id = ?`,
        values
      );
      
      console.log('更新影响行数:', result.affectedRows);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新物品实例失败:', error);
      throw error;
    }
  }
  
  // 删除物品实例
  static async deletePlayerItem(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM player_item WHERE item_inst_id = ?', 
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除物品实例失败:', error);
      throw error;
    }
  }

  // 根据账户ID获取物品（修正关联逻辑）
  static async getPlayerItemsByAccountId(accountId) {
    try {
      const [rows] = await pool.execute(`
        SELECT pi.*, c.char_name, it.item_name 
        FROM player_item pi
        LEFT JOIN \`character\` c ON pi.char_id = c.char_id
        LEFT JOIN item_template it ON pi.item_id = it.item_id
        WHERE c.account_id = ?
      `, [accountId]);
      return rows || [];
    } catch (error) {
      console.error('获取账户物品列表失败:', error);
      throw error;
    }
  }
}

module.exports = PlayerItem;