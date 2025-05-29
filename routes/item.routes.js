const express = require('express');
const router = express.Router();
const itemModel = require('../models/itemtemp.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 获取物品列表
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const items = await itemModel.getAllItems();
    res.render('items/index', { title: '物品管理', items });
  } catch (error) {
    req.flash('error', '获取物品列表失败');
    res.redirect('/items'); // 修改为固定路由
  }
});

// 显示创建物品表单
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('items/create', { title: '创建物品' });
});

// 处理创建物品请求
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const itemData = req.body;
    const itemId = await itemModel.createItem(itemData);
    req.flash('success', '物品创建成功');
    res.redirect('/items');
  } catch (error) {
    req.flash('error', '创建物品失败');
    res.redirect('/items'); // 修改为固定路由
  }
});

// 显示编辑物品表单
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await itemModel.getItemById(req.params.id);
    if (!item) {
      req.flash('error', '物品不存在');
      return res.redirect('/items'); // 修改为固定路由
    }
    res.render('items/edit', { title: '编辑物品', item });
  } catch (error) {
    req.flash('error', '获取物品信息失败');
    res.redirect('/items'); // 修改为固定路由
  }
});



module.exports = router;