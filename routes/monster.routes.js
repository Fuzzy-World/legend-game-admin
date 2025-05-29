const express = require('express');
const router = express.Router();
const MonsterTemplate = require('../models/monster.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 怪物列表
router.get('/', isAuthenticated,isAdmin, async (req, res) => {
  try {
    const monsters = await MonsterTemplate.getAllMonsters();
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
    const [maps] = await req.app.locals.db.execute('SELECT map_id, map_name FROM map_info');
    // 原错误点：drop_table表无table_name字段，改为联表查询item_template获取物品名称
    const [dropTables] = await req.app.locals.db.execute(`
      SELECT dt.drop_table_id, it.item_name AS table_name 
      FROM drop_table dt 
      LEFT JOIN item_template it ON dt.item_id = it.item_id
    `);
    res.render('monsters/create', {
      title: '创建新怪物',
      flash: { error: req.flash('error') },
      session: req.session,
      maps,  // 传递地图数据
      dropTables  // 现在table_name实际为item_template中的物品名称
    });
  } catch (error) {
    console.error('加载怪物创建页面失败:', error);
    req.flash('error', '无法加载创建页面');
    res.redirect('/monsters');
  }
});

// 处理创建怪物的POST请求
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const monsterData = req.body;
    await MonsterTemplate.createMonster(monsterData);
    req.flash('success', '怪物创建成功');
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', error.message || '创建怪物失败');
    res.redirect('/monsters/create');
  }
});

// 编辑怪物页面
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // 参数验证优化：明确检查id存在性和有效性
    const id = Number(req.params.id);
    if (isNaN(id) || !req.params.id) {
      req.flash('error', '请求中缺少有效的怪物ID');
      return res.redirect('/monsters');
    }
    const monster = await MonsterTemplate.getMonsterById(id);
    if (!monster) {
      req.flash('error', '怪物不存在');
      return res.redirect('/monsters');
    }
    res.render('monsters/edit', {
      title: '编辑怪物',
      monster,
      flash: { error: req.flash('error') },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '获取怪物信息失败');
    res.redirect('/monsters');
  }
});

// 处理编辑怪物的POST请求
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // 新增参数验证：确保id有效
    const id = Number(req.params.id);
    if (isNaN(id) || !req.params.id) {
      req.flash('error', '请求中缺少有效的怪物ID');
      return res.redirect('/monsters');
    }
    const success = await MonsterTemplate.updateMonster(id, req.body);
    if (success) {
      req.flash('success', '怪物信息更新成功');
    } else {
      req.flash('error', '更新失败，请检查数据');
    }
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', error.message || '更新怪物失败');
    // 原错误点：使用req.params.id替代可能未定义的id变量
    res.redirect(`/monsters/edit/${req.params.id}`);
  }
});

// 添加：删除确认页面（GET请求）
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || !req.params.id) {
      req.flash('error', '请求中缺少有效的怪物ID');
      return res.redirect('/monsters');
    }
    const monster = await MonsterTemplate.getMonsterById(id);
    if (!monster) {
      req.flash('error', '怪物不存在');
      return res.redirect('/monsters');
    }
    res.render('monsters/delete', {
      title: '确认删除怪物',
      monster,
      session: req.session,
      flash: { error: req.flash('error') }
    });
  } catch (error) {
    req.flash('error', '获取怪物信息失败');
    res.redirect('/monsters');
  }
});

// 删除怪物（POST请求，已有代码无需修改）
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // 添加关键步骤日志
    console.log('[MONSTER] 删除请求，ID：', id);
    const success = await MonsterTemplate.deleteMonster(id);
    if (success) {
      req.flash('success', '怪物删除成功');
    } else {
      req.flash('error', '怪物删除失败');
    }
    res.redirect('/monsters');
  } catch (error) {
    req.flash('error', error.message || '删除怪物失败');
    res.redirect('/monsters');
  }
});

module.exports = router;