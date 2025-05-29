const express = require('express');
const router = express.Router();
const dropModel = require('../models/drop.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const itemModel = require('../models/itemtemp.model');
const db = require('../config/db.config');
// 获取所有掉落记录
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const drops = await dropModel.getAllDropsWithItems();
    const items_template = await itemModel.getAllTemplateItems();
    
    res.render('drops/index', {
      title: '掉落与模板整合管理',
      drops,
      items_template,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    req.flash('error', '获取数据失败');
    res.redirect('/drops');
  }
});


// 修改后：获取item_template表（模板物品）
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const items = await itemModel.getAllTemplateItems();  // 正确：获取item_template表
    // 添加 title 变量传递给模板
    res.render('drops/create', { 
      items, 
      title: '创建新物品模板及掉落'  
    });
  } catch (error) { /* ... */ }
});

// 处理创建掉落记录
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const itemData = {
      item_name: req.body.item_name,
      type: req.body.type,
      rarity: req.body.rarity
    };
    const itemId = await itemModel.createTemplateItem(itemData);

    const dropData = {
      item_id: itemId,
      drop_rate: req.body.drop_rate,
      is_bind: req.body.is_bind ? 1 : 0
    };
    await dropModel.createDrop(dropData);

    req.flash('success', '物品及掉落创建成功');
    res.redirect('/drops');
  } catch (error) {
    // 修改：移除未定义的db操作
    req.flash('error', `创建失败: ${error.message}`);
    res.redirect('/drops/create');
  }
});

// 处理编辑掉落记录
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  // 修改：使用正确的数据库连接
  const connection = await db.getConnection(); // 获取数据库连接
  try {
    await connection.beginTransaction();

    // 确保从请求参数获取正确的item_id
    const itemId = parseInt(req.body.item_id);
    if (!itemId) throw new Error('缺少物品ID');
    
    // 更新物品模板
    const itemUpdate = await itemModel.updateTemplateItem(
      itemId,
      {
        item_name: req.body.item_name,
        type: req.body.type,
        rarity: req.body.rarity,
        is_bind: req.body.is_bind ? 1 : 0  // 添加is_bind字段
      },
      connection
    );

    // 更新掉落表
    const dropUpdate = await dropModel.updateDrop(
      req.params.id,
      {
        drop_rate: req.body.drop_rate,
        is_bind: req.body.is_bind ? 1 : 0
      },
      connection
    );

    await connection.commit();
    
    if (dropUpdate) {
      req.flash('success', '物品模板及掉落记录更新成功');
    } else {
      req.flash('error', '更新失败：找不到对应记录');
    }
    res.redirect('/drops');
  } catch (error) {
    // 修改：使用正确的连接对象进行回滚
    await connection.rollback();
    req.flash('error', `更新失败：${error.message}`);
    res.redirect('/drops');
  } finally {
    // 新增：确保释放数据库连接
    if (connection) connection.release();
  }
});


// 编辑掉落记录页面
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const drop = await dropModel.getDropById(req.params.id);
    const items = await itemModel.getAllTemplateItems(); // 修改为获取模板物品
    res.render('drops/edit', { 
      drop,
      items, // 传递物品数据给视图
      title: '编辑掉落记录' 
    });
  } catch (error) {
    req.flash('error', '获取编辑数据失败');
    res.redirect('/drops');
  }
});

// 处理编辑掉落记录（错误处理补充）
// 合并后的编辑路由处理（删除重复路由）
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const dropId = parseInt(req.params.id);
    const itemId = parseInt(req.body.item_id);
    
    // 更新物品模板（新增template_is_bind处理）
    await itemModel.updateTemplateItem(
      itemId,
      {
        item_name: req.body.item_name,
        type: req.body.type,
        rarity: req.body.rarity,
        is_bind: req.body.template_is_bind ? 1 : 0  // 新增模板绑定状态字段
      },
      connection
    );

    // 更新掉落记录（保持原有逻辑）
    await dropModel.updateDrop(
      dropId,
      {
        drop_rate: parseFloat(req.body.drop_rate),
        is_bind: req.body.is_bind ? 1 : 0
      },
      connection
    );

    await connection.commit();
    req.flash('success', '物品模板及掉落记录更新成功');
    res.redirect('/drops');
  } catch (error) {
    await connection.rollback();
    req.flash('error', `更新失败：${error.message}`);
    res.redirect('/drops');
  } finally {
    if (connection) connection.release();
  }
});

router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const drop = await dropModel.getDropById(req.params.id);
    if (!drop) {
      req.flash('error', '掉落记录不存在');
      return res.redirect('/drops');
    }
    
    // 获取关联的物品模板信息
    const item = await itemModel.getTemplateItemById(drop.item_id);
    
    res.render('drops/delete', {
      title: '确认删除物品模板及掉落记录',
      drop,
      item, // 传递物品模板信息到视图
      flash: { error: req.flash('error') }
    });
  } catch (error) {
    console.error('加载删除页面失败:', error);
    req.flash('error', '加载删除页面失败');
    res.redirect('/drops');
  }
});

// 处理删除操作（优化后）
router.delete('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const dropId = parseInt(req.params.id);
    // 新增存在性检查
    const dropExists = await dropModel.getDropById(dropId);
    if (!dropExists) {
      req.flash('error', '要删除的掉落记录不存在');
      return res.redirect('/drops');
    }
    
    // 执行级联删除
    const success = await dropModel.deleteDrop(dropId);
    
    if (success) {
      req.flash('success', '物品模板及掉落记录删除成功');
    } else {
      req.flash('error', '删除失败：未找到相关记录');
    }
    res.redirect('/drops');
  } catch (error) {
    console.error('删除处理失败:', error);
    req.flash('error', `删除失败：${error.message}`);
    res.redirect('/drops');
  }
});

module.exports = router;