const db = require('../config/db.config'); // 修改为正确路径

module.exports = {
  getAllCharacters: async () => {
    const [rows] = await db.query('SELECT * FROM v_character_full_stats');
    return rows;
  },

  getCharacterById: async (id) => {
    const [rows] = await db.query('SELECT * FROM `character` WHERE char_id = ?', [id]);
    return rows[0];
  },

  // 新增：按账户ID获取角色列表
  getCharactersByAccountId: async (accountId) => {
    const [rows] = await db.query('SELECT * FROM v_character_full_stats WHERE account_id = ?', [accountId]);
    return rows;
  },

  // 修改：同账户下角色名称唯一性校验（原checkNameExists方法）
  checkNameExists: async (name, accountId) => {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM `character` WHERE char_name = ? AND account_id = ?',
      [name, accountId]
    );
    return rows[0].count > 0;
  },

  // 新增账户存在性检查方法
  checkAccountExists: async (accountId) => {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM account WHERE account_id = ?', [accountId]);
    return rows[0].count > 0;
  },

  createCharacter: async (data) => {
    async function createCharacter(characterData) {
      // 新增账户封禁检查
      const [account] = await db.query(
          'SELECT is_banned FROM account WHERE account_id = ?',
          [characterData.account_id]
      );
      
      if (!account.length) {
          throw new Error('关联账户不存在');
      }
      
      if (account[0].is_banned === 1) {
          throw new Error('该账户已被封禁，无法创建角色');
      }
      
      // 角色名称验证（2-6个汉字）
      if (!/^[\u4e00-\u9fa5]{2,6}$/.test(characterData.char_name)) {
        throw new Error('角色名必须为2-6个汉字');
      }
      
      // 修正表名为character（原表名拼写错误）
      const sql = `INSERT INTO \`character\`
        (account_id, char_name, level, hp_max, attack, defense) 
        VALUES (?, ?, ?, ?, ?, ?)`;
      
      // 使用正确的db引用（原pool变量未定义）
      const [result] = await db.query(sql, [
        characterData.account_id,
        characterData.char_name,
        characterData.level || 1,
        characterData.hp_max || 100,
        characterData.attack || 10,
        characterData.defense || 5
      ]);
      
      return result.insertId;
    }
    return createCharacter(data);
  },

  
  // 修改后正确代码
  updateCharacter: async (id, data) => {
    const { char_name, level, hp_max, attack, defense } = data;
    
    // 新增事务处理确保数据一致性
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        'UPDATE `character` SET char_name = ?, level = ?, hp_max = ?, attack = ?, defense = ? WHERE char_id = ?',
        [char_name, level, hp_max, attack, defense, id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // 添加以下方法

  // 修改后正确代码
  async deleteCharacter(id) {
    const [result] = await db.execute(
      'DELETE FROM `character` WHERE char_id = ?', // 修正表名和引用方式
      [id]
    );
    return result.affectedRows;
  }
};