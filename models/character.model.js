const db = require('../config/db.config'); // 修改为正确路径

module.exports = {
  getAllCharacters: async () => {
    const [rows] = await db.query('SELECT * FROM `character`');
    return rows;
  },

  getCharacterById: async (id) => {
    const [rows] = await db.query('SELECT * FROM `character` WHERE char_id = ?', [id]);
    return rows[0];
  },

  checkNameExists: async (name) => {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM `character` WHERE char_name = ?', [name]);
    return rows[0].count > 0;
  },

  createCharacter: async (data) => {
    const VALID_CLASSES = new Set(['战士', '法师', '牧师', '刺客', '射手']);

    async function createCharacter(characterData) {
      // 新增职业验证
      if (!VALID_CLASSES.has(characterData.char_name)) {
        throw new Error('无效的职业类型');
      }
      
      const sql = `INSERT INTO characters 
        (account_id, char_name, level, hp_max, attack, defense) 
        VALUES (?, ?, ?, ?, ?, ?)`;
      
      const [result] = await pool.execute(sql, [
        characterData.account_id,
        characterData.char_name,
        characterData.level || 1,
        characterData.hp_max || 100,
        characterData.attack || 10,
        characterData.defense || 5
      ]);
      
      return result.insertId;
    }
  },

  updateCharacter: async (id, data) => {
    const { level, hp_max, attack, defense } = data;
    const [result] = await db.query(
      'UPDATE `character` SET level = ?, hp_max = ?, attack = ?, defense = ? WHERE char_id = ?',
      [level, hp_max, attack, defense, id]
    );
    return result.affectedRows > 0;
  },

  // 添加以下方法
  async deleteCharacter(id) {
    const [result] = await this.db.execute(
      'DELETE FROM characters WHERE char_id = ?',
      [id]
    );
    return result.affectedRows;
  }
};