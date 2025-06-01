const db = require('../config/db.config');

async function getAllAchievements() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        achievement_id,
        achievement_name,
        achievement_type,
        description,
        points,
        icon_path
      FROM achievement_template
    `);
    return rows;
  } catch (error) {
    console.error('获取成就模板失败:', error);
    throw new Error('数据库查询失败');
  }
}

async function createAchievement(achievementData) {
  const validTypes = ['等级', '装备', '任务', 'PVP', '探索'];
  if (!validTypes.includes(achievementData.achievement_type)) {
    throw new Error('无效的成就类型');
  }
  
  const { achievement_name, achievement_type, description, points, icon_path } = achievementData;
  const [result] = await db.execute(
    'INSERT INTO achievement_template (achievement_name, achievement_type, description, points, icon_path) VALUES (?, ?, ?, ?, ?)',
    [achievement_name, achievement_type, description, points, icon_path]
  );
  return result.insertId;
}

async function updateAchievement(id, achievementData) {
  const validTypes = ['等级', '装备', '任务', 'PVP', '探索'];
  if (achievementData.achievement_type && !validTypes.includes(achievementData.achievement_type)) {
    throw new Error('无效的成就类型');
  }

  // 修复SQL语句和参数格式
  const fields = [];
  const values = [];
  
  Object.entries(achievementData).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (fields.length === 0) {
    throw new Error('没有可更新的字段');
  }

  const [result] = await db.execute(
    `UPDATE achievement_template SET ${fields.join(', ')} WHERE achievement_id = ?`,
    [...values, id]
  );
  
  return result.affectedRows > 0;
}

async function getAchievementById(id) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM achievement_template WHERE achievement_id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('获取成就详情失败:', error);
    throw new Error('数据库查询失败');
  }
}
async function deleteAchievement(id){
  try {
    const [result] = await db.execute(
      'DELETE FROM achievement_template WHERE achievement_id =?',
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除成就失败:', error);
    throw new Error('数据库查询失败');}
}
async function getAchievementsByChar_Id(Char_Id) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM v_player_achievement_progress WHERE char_id =?',
      [Char_Id]
    );
    return rows || [];
  } catch (error) {
    console.error('获取成就列表失败:', error);
    throw new Error('数据库查询失败');} 
  }

module.exports = {
  getAllAchievements,
  createAchievement,
  updateAchievement,
  getAchievementById,
  deleteAchievement,
  getAchievementsByChar_Id,
};