const express = require('express');
const router = express.Router();
const dropModel = require('../models/drop.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const itemModel = require('../models/item.model');

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
    // 移除直接的db操作，改为通过模型层
    const itemData = {
      item_name: req.body.item_name,
      type: req.body.type,
      rarity: req.body.rarity
    };
    // 修改为调用itemModel的创建方法
    const itemId = await itemModel.createTemplateItem(itemData);

    const dropData = {
      item_id: itemId,
      drop_rate: req.body.drop_rate,
      is_bind: req.body.is_bind ? 1 : 0
    };
    // 修改为调用dropModel的创建方法
    await dropModel.createDrop(dropData);

    req.flash('success', '物品及掉落创建成功');
    res.redirect('/drops');
  } catch (error) {
    await db.query('ROLLBACK');
    req.flash('error', `创建失败: ${error.message}`);
    res.redirect('/drops/create');
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

// 处理编辑掉落记录
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const success = await dropModel.updateDrop(req.params.id, req.body);
    if (success) {
      req.flash('success', '掉落记录更新成功');
    } else {
      req.flash('error', '未找到需要更新的记录');
    }
    res.redirect('/drops');
  } catch (error) {
    req.flash('error', `更新失败: ${error.message}`);
    res.redirect('/drops');
  }
});

// 删除确认页面
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const drop = await dropModel.getDropById(req.params.id);
    if (!drop) {
      req.flash('error', '掉落记录不存在');
      return res.redirect('/drops');
    }
    res.render('drops/delete', {
      title: '确认删除掉落记录',
      drop,
      session: req.session,
      flash: { error: req.flash('error') }
    });
  } catch (error) {
    req.flash('error', '加载删除页面失败');
    res.redirect('/drops');
  }
});

// 处理删除操作（修改后）
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const success = await dropModel.deleteDrop(req.params.id);
    if (success) {
      req.flash('success', '掉落记录及关联物品模板删除成功'); // 提示信息更新
    } else {
      req.flash('error', '未找到需要删除的记录');
    }
    res.redirect('/drops');
  } catch (error) {
    req.flash('error', error.message); // 直接使用事务中抛出的具体错误
    res.redirect('/drops');
  }
});

module.exports = router;