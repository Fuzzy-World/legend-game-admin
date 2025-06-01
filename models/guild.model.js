const db = require('../config/db.config');

// 自定义错误类型
class GuildError extends Error {
  constructor(message, code = 500) {
    super(message);
    this.code = code;
    this.name = 'GuildError';
  }
}

// 获取角色所属公会
async function getGuildsByChar_Id(charId) {
  const [rows] = await db.execute(`
    SELECT * 
    FROM v_guild_members
    WHERE guild_id = ?
  `, [charId]);
  return rows;
}

// 获取所有公会列表
async function getAllGuilds() {
  const [rows] = await db.execute(`
    SELECT 
      guild_id,
      guild_name,
      founder_id AS leaderCharId,
      level,
      member_count,
      create_time AS createdAt
    FROM guild
  `);
  return rows;
}

// 创建公会（含数据验证和成员表自动插入）
async function createGuild(guildData) {
  const { guild_name, founder_id } = guildData;
  
  // 必选参数验证
  if (!guild_name || !founder_id) {
    throw new GuildError('公会名称和会长ID为必填项', 400);
  }
  
  // 验证会长角色存在性
  const [charCheck] = await db.execute(
    'SELECT char_id FROM `character` WHERE char_id = ?',
    [founder_id]
  );
  if (charCheck.length === 0) {
    throw new GuildError('指定的会长ID不存在', 404);
  }
  
  // 验证公会名称唯一性
  const [nameCheck] = await db.execute(
    'SELECT guild_id FROM guild WHERE guild_name = ?',
    [guild_name]
  );
  if (nameCheck.length > 0) {
    throw new GuildError('公会名称已存在', 409);
  }
  
  // 开启事务确保数据一致性
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    const [guildResult] = await connection.execute(
      'INSERT INTO guild (guild_name, founder_id) VALUES (?, ?)',
      [guild_name, founder_id]
    );
    const guildId = guildResult.insertId;

    // 插入公会成员（会长）
    await connection.execute(
      'INSERT INTO guild_member (guild_id, char_id, role) VALUES (?, ?, "会长")',
      [guildId, founder_id]
    );

    // 更新公会成员数为 1
    await connection.execute(
      'UPDATE guild SET member_count = 1 WHERE guild_id = ?',
      [guildId]
    );

    await connection.commit();
    return guildId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 更新公会信息
async function updateGuild(id, guildData) {
  const fields = [];
  const values = [];
  
  // 定义可更新字段
  const validFields = {
    guild_name: guildData.guild_name,
    description: guildData.description,
    level: guildData.level,
    member_count: guildData.member_count,
    icon_path: guildData.icon_path
  };
  
  Object.entries(validFields).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  // 没有可更新的字段
  if (fields.length === 0) {
    return false;
  }
  
  // 执行更新
  const [result] = await db.execute(
    `UPDATE guild SET ${fields.join(', ')} WHERE guild_id = ?`,
    [...values, id]
  );
  
  return result.affectedRows > 0;
}

// 根据ID获取公会详情
async function getGuildById(id) {
  const [rows] = await db.execute(
    'SELECT * FROM guild WHERE guild_id = ?',
    [id]
  );
  return rows[0] || null;
}

// 删除公会（需先处理成员关系）
async function deleteGuild(id) {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    // 先删除公会成员
    await connection.execute('DELETE FROM guild_member WHERE guild_id = ?', [id]);
    // 再删除公会
    const [result] = await connection.execute(
      'DELETE FROM guild WHERE guild_id = ?',
      [id]
    );
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getGuildsByChar_Id,
  getAllGuilds,
  createGuild,
  updateGuild,
  getGuildById,
  deleteGuild,
  GuildError // 导出自定义错误类型
};