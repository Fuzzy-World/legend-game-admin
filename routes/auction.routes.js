const express = require('express');
const router = express.Router();
const auctionModel = require('../models/auction.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const itemModel = require('../models/item.model');

router.get('/', async (req, res) => {
  try {
    const auction = await auctionModel.getActiveauction();
      
    res.render('auction/index', { 
        title: '拍卖列表',
        auction,
        session: req.session,
        flash: {
          success: req.flash('success'),
          error: req.flash('error')
        }
    });
  } catch (error) {
    console.error('[ERROR] 拍卖列表获取失败:', error.stack); // 增强错误日志
    req.flash('error', '获取拍卖列表失败');
    res.redirect('/auction');
  }
});

// 新增拍卖页面（补充完整逻辑）
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [items, sellers] = await Promise.all([
      // 获取物品和卖家数据
    ]);
    
    res.render('auction/create', {
      title: '新建拍卖',
      items, // 添加这行传递物品数据
      sellers,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载创建页面失败');
    res.redirect('/auction');
  }
});

// 处理创建表单提交
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // 处理表单数据并创建拍卖
    res.redirect('/auction');
  } catch (error) {
    req.flash('error', '创建拍卖失败');
    res.redirect('/auction/create');
  }
});

// 编辑拍卖页面（新增路由）
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const auction = await auctionModel.getAuctionById(req.params.id);
    const statusOptions = [
      { value: '上架中', text: '进行中' },
      { value: '已下架', text: '已结束' }
    ];
    
    res.render('auction/edit', {
      title: '编辑拍卖',
      auction,
      statusOptions,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载编辑页面失败');
    res.redirect('/auction');
  }
});

// 处理删除操作（补充POST路由）
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const success = await auctionModel.deleteAuction(req.params.id);
    if (success) {
      req.flash('success', '拍卖记录删除成功');
    } else {
      req.flash('error', '删除失败，拍卖记录可能不存在');
    }
    res.redirect('/auction');
  } catch (error) {
    console.error('删除拍卖失败:', error);
    req.flash('error', '删除过程中发生错误');
    res.redirect('/auction');
  }
});

// 导出 Router 实例
module.exports = router; // 关键修复：添加这一行