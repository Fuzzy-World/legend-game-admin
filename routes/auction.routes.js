const express = require('express');
const router = express.Router();
const auctionModel = require('../models/auction.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const itemModel = require('../models/itemtemp.model');

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
    const { status, buy_now_price, current_highest_bid, end_time } = req.body; // 新增buy_now_price
    const success = await auctionModel.updateAuction(
      req.params.id, 
      status,
      buy_now_price,  // 新增参数
      current_highest_bid, 
      end_time
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

// 处理用户报价
router.post('/bid/:id', isAuthenticated, async (req, res) => {
  try {
    const auctionId = req.params.id;
    const bidAmount = parseFloat(req.body.bidAmount);
    const bidderCharId = req.session.user?.char_id;  // 使用角色ID（char_id）
    
    // 参数校验
    if (!auctionId) {
      console.error('报价失败：auctionId未提供');
      req.flash('error', '报价失败：拍卖ID缺失');
      return res.redirect('/user/auctions');
    }
    if (isNaN(bidAmount)) {
      console.error('报价失败：bidAmount无效，原始输入:', req.body.bidAmount);
      req.flash('error', '报价失败：请输入有效的数字金额');
      return res.redirect('/user/auctions');
    }
    if (!bidderCharId) {
      console.error('报价失败：bidderCharId未获取到，session.user:', req.session.user);
      req.flash('error', '报价失败：用户未关联角色或会话异常');
      return res.redirect('/login');
    }

    const success = await auctionModel.updateBid(
      auctionId, 
      bidAmount, 
      bidderCharId  // 新增最后一个参数作为last_bidder_id
    );
    
    if (success) {
      const auction = await auctionModel.getAuctionById(auctionId);
      if (!auction) {
        req.flash('error', '拍卖已结束或不存在');
        return res.redirect('/user/auctions');
      }
      
      // 移除不必要的重定向，使用定时器延迟设置flash消息
      setTimeout(() => {
        if (auction?.buy_now_price && bidAmount >= auction.buy_now_price) {
          req.flash('success', '恭喜！已通过一口价直接购买成功！');
        } else {
          req.flash('success', '报价成功！');
        }
      }, 1500);
      
      // 立即重定向，而不是在定时器中
      res.redirect('/user/auctions');
    } else {
      req.flash('error', '报价失败：出价不够高或拍卖已结束');
      return res.redirect('/user/auctions');
    }
  } catch (error) {
    console.error('报价错误:', error);
    req.flash('error', '报价时发生系统错误');
    res.redirect('/user/auctions');
  }
});

module.exports = router;