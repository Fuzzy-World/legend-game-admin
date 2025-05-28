const express = require('express');
const router = express.Router();
const monsterModel = require('../models/monster.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const { 
  checkMapExists 
} = require('../models/monster.model');

// 怪物列表
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const monsters = await monsterModel.getAllMonsters();
    res.render('monsters/index', {
      title: '怪物模板管理',
      monsters,
      session: req.session,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    console.error('获取怪物列表失败:', error);
    req.flash('error', '获取怪物列表失败');
    res.redirect('/monsters');
  }
});

// 创建怪物页面
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // 这里可以预获取地图和掉落表数据用于下拉选择
    res.render('monsters/create', {
      title: '创建新怪物',
      flash: { error: req.flash('error') },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '无法加载创建页面');
    res.redirect('/monsters');
  }
});

// 处理创建怪物的POST请求
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('[MONSTER] 接收到创建请求，表单数据：', req.body); // 新增请求数据日志
    let monsterData = req.body;
    // 定义所有预期的字段列表（包括可选字段）
    const expectedFields = ['monster_name', 'monster_type', 'level', 'hp_max', 
      'attack', 'defense', 'map_id', 'drop_table_id', 'optional_field1', 'optional_field2']; // 根据实际表结构补充
    
    // 强制补全缺失字段为null（关键改进）
    expectedFields.forEach(field => {
      if (monsterData[field] === undefined) {
        monsterData[field] = null;
      }
    });

    // 验证必填字段
    if (!monsterData.monster_name || !monsterData.monster_type || 
        !monsterData.level || !monsterData.hp_max || 
        !monsterData.attack || !monsterData.defense ||
        !monsterData.map_id || !monsterData.drop_table_id) {
      req.flash('error', '怪物名称、类型、等级、属性、地图和掉落表为必填字段');
      return res.redirect('/monsters/create');
    }
    
    // 验证地图和掉落表是否存在
    const mapExists = await monsterModel.checkMapExists(monsterData.map_id);
    const dropTableExists = await monsterModel.checkDropTableExists(monsterData.drop_table_id);
    if (!mapExists) {
      console.warn('[MONSTER] 用户提交无效地图ID：', monsterData.map_id); // 记录无效参数
      req.flash('error', '选择的地图不存在');
      return res.redirect('/monsters/create');
    }
    if (!dropTableExists) {
      req.flash('error', '选择的掉落表不存在');
      return res.redirect('/monsters/create');
    }
    
    // 创建怪物
    const monsterId = await monsterModel.createMonster(monsterData);
    if (!monsterId) { // 新增数据库插入结果校验
      throw new Error('数据库未返回插入ID');
    }
    req.flash('success', `怪物创建成功，ID：${monsterId}`); // 明确提示ID
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', `创建失败：${error.message}`); // 传递具体错误信息
    res.redirect('/monsters/create');
  }
});

// 编辑怪物页面
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const monsterId = req.params.id;
    if (!monsterId || isNaN(Number(monsterId))) {
      req.flash('error', '无效的怪物ID，请检查链接');
      return res.redirect('/monsters');
    }
    
    const monster = await monsterModel.getMonsterById(monsterId);
    if (!monster) {
      req.flash('error', '怪物不存在或已被删除');
      return res.redirect('/monsters');
    }

    // 预获取地图和掉落表数据（新增）
    const maps = await monsterModel.getAllMaps(); // 需要在 monster.model.js 中添加 getAllMaps 方法
    const dropTables = await monsterModel.getAllDropTables(); // 需要在 monster.model.js 中添加 getAllDropTables 方法
    
    res.render('monsters/edit', {
      title: '编辑怪物',
      monster,
      maps, // 传递给前端
      dropTables, // 传递给前端
      flash: { error: req.flash('error') },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '获取怪物信息失败：' + error.message);
    res.redirect('/monsters');
  }
});

// 处理编辑怪物的POST请求
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const monsterId = req.params.id;
    let monsterData = req.body;
    
    // 数值字段类型转换（新增）
    const numericFields = ['level', 'hp_max', 'attack', 'defense', 'move_speed'];
    numericFields.forEach(field => {
      if (monsterData[field]) {
        monsterData[field] = parseInt(monsterData[field]);
      }
    });

    // 新增：检查必填字段
    const requiredFields = ['monster_name', 'monster_type', 'map_id', 'drop_table_id'];
    requiredFields.forEach(field => {
      if (!monsterData[field]) {
        throw new Error(`缺少必要字段：${field}`);
      }
    });

    // 数值字段白名单校验（新增）
    const allowedNumericFields = ['level', 'hp_max', 'attack', 'defense', 'move_speed'];
    allowedNumericFields.forEach(field => {
      if (typeof monsterData[field] === 'string' && !/^\d+$/.test(monsterData[field])) {
        throw new Error(`${field} 必须为有效整数`);
      }
    });

    // 新增地图和掉落表缓存检查
    const [currentMonster] = await monsterModel.getMonsterById(monsterId);
    const isMapChanged = currentMonster.map_id !== parseInt(monsterData.map_id);
    const isDropTableChanged = currentMonster.drop_table_id !== parseInt(monsterData.drop_table_id);

    if (isMapChanged || isDropTableChanged) {
      const [mapExists, dropTableExists] = await Promise.all([
        monsterModel.checkMapExists(monsterData.map_id),
        monsterModel.checkDropTableExists(monsterData.drop_table_id)
      ]);
      
      if (!mapExists) {
        req.flash('error', '选择的地图不存在');
        return res.redirect(`/monsters/edit/${monsterId}`);
      }
      if (!dropTableExists) {
        req.flash('error', '选择的掉落表不存在');
        return res.redirect(`/monsters/edit/${monsterId}`);
      }
    }

    // 记录原始数据用于变化检测（新增）
    const originalData = await monsterModel.getMonsterById(monsterId);
    let hasChanges = false;
    Object.keys(monsterData).forEach(key => {
      if (originalData[key] !== monsterData[key]) {
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      req.flash('warning', '未检测到数据变更');
      return res.redirect(`/monsters/edit/${monsterId}`);
    }

    const success = await monsterModel.updateMonster(monsterId, monsterData);
    if (success) {
      req.flash('success', '怪物信息更新成功');
    } else {
      req.flash('error', '未找到需要更新的怪物或数据未变化');
    }
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', `更新失败：${error.message}`);
    res.redirect(`/monsters/edit/${req.params.id}`);
  }
});

// 删除怪物确认页面
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const monster = await monsterModel.getMonsterById(req.params.id);
    if (!monster) {
      req.flash('error', '怪物不存在');
      return res.redirect('/monsters');
    }
    res.render('monsters/delete', {
      title: '确认删除怪物',
      monster,
      flash: { error: req.flash('error') },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载删除页面失败');
    res.redirect('/monsters');
  }
});

// 处理删除怪物的POST请求
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const success = await monsterModel.deleteMonster(req.params.id);
    if (success) {
      req.flash('success', '怪物删除成功');
    } else {
      req.flash('error', '怪物删除失败');
    }
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', '删除怪物失败');
    res.redirect('/monsters');
  }
});

module.exports = router;

// Replace "app.post" with "router.post" to use the local router object
router.post('/update', async (req, res) => {  // Fixed line: "router" instead of "app"
  const { map_id } = req.body;
  const mapExists = await checkMapExists(map_id);
  if (!mapExists) {
    return res.status(400).send('关联的地图不存在');
  }
  // ... 后续更新逻辑
});