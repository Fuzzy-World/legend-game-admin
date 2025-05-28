const express = require('express');
const router = express.Router();
const auctionModel = require('../models/auction.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const itemModel = require('../models/item.model');

router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG] 开始查询拍卖列表...');
    const auction = await auctionModel.getActiveauction();
    console.log(`[DEBUG] 成功获取拍卖列表，共${auction.length}条记录`);
      
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
    console.error('[ERROR] 拍卖列表获取失败:', error.stack);
    req.flash('error', '获取拍卖列表失败');
    res.redirect('/auction');
  }
});

// 新增拍卖页面
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const items = await itemModel.getAllTemplateItems();
    const [sellers] = await req.app.locals.db.execute(
      'SELECT char_id AS id, char_name AS username FROM `character`'
    );
    
    res.render('auction/create', { 
      title: '创建拍卖',
      items,
      sellers,
      session: req.session,
      flash: {
        error: req.flash('error')
      }
    });
  } catch (err) {
    console.error('获取拍卖创建数据失败:', {
      error: err,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    req.flash('error', '获取创建拍卖所需数据失败: ' + err.message);
    res.redirect('/auction');
  }
});

// 处理创建表单提交
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { item_inst_id, seller_id, start_price, buy_now_price, end_time } = req.body;
    const result = await auctionModel.createAuction(
      item_inst_id, seller_id, start_price, buy_now_price, end_time
    );
    if (result) {
      req.flash('success', '拍卖创建成功');
      res.redirect('/auction');
    } else {
      throw new Error('创建拍卖失败，数据库操作未成功');
    }
  } catch (error) {
    console.error('创建拍卖失败:', error);
    req.flash('error', '创建拍卖失败: ' + error.message);
    res.redirect('/auction/create');
  }
});

// 编辑拍卖页面
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const auction = await auctionModel.getAuctionById(req.params.id);
    
    if (!auction) {
      req.flash('error', '拍卖记录不存在');
      return res.redirect('/auction');
    }
    
    if (auction.status !== '上架中') {
      req.flash('error', '只能修改上架中的拍卖');
      return res.redirect('/auction');
    }
    
    const statusOptions = [
      { value: '上架中', text: '进行中' },
      { value: '已完成', text: '已完成' },
      { value: '流拍', text: '流拍' }
    ];
    
    res.render('auction/edit', {
      title: '编辑拍卖',
      auction,
      statusOptions,
      session: req.session
    });
  } catch (error) {
    console.error('加载编辑页面失败:', error);
    req.flash('error', '加载编辑页面失败');
    res.redirect('/auction');
  }
});

// 处理编辑表单提交
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, current_highest_bid, end_time } = req.body;
    const success = await auctionModel.updateAuction(
      req.params.id, status, current_highest_bid, end_time
    );
    
    if (success) {
      req.flash('success', '拍卖记录更新成功');
    } else {
      req.flash('error', '更新失败，拍卖记录可能不存在');
    }
    res.redirect('/auction');
  } catch (error) {
    console.error('更新拍卖失败:', error);
    req.flash('error', '更新过程中发生错误');
    res.redirect(`/auction/edit/${req.params.id}`);
  }
});

// 处理删除操作
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const auction = await auctionModel.getAuctionById(req.params.id);
    if (!auction) {
      req.flash('error', '拍卖记录不存在');
      return res.redirect('/auction');
    }
    res.render('auction/delete', {
      title: '确认删除拍卖',
      auction,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载删除页面失败');
    res.redirect('/auction');
  }
});

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

module.exports = router;    