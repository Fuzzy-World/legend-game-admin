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
router.get('/bid/:id', isAuthenticated, async (req, res) => {
  try {
    const auctionId = req.params.id;
    const auction = await auctionModel.getAuctionById(auctionId);
    
    if (!auction) {
      req.flash('error', '拍卖记录不存在');
      return res.redirect('/auction');
    }
    
    if (auction.status !== '上架中' || new Date(auction.end_time) <= new Date()) {
      req.flash('error', '该拍卖已结束或不可出价');
      return res.redirect(`/auction/${auctionId}`);
    }
    
    res.render('auction/bid', {
      title: '参与拍卖',
      auction,
      session: req.session
    });
  } catch (error) {
    console.error('加载报价页面失败:', error);
    req.flash('error', '加载报价页面失败');
    res.redirect('/auction');
  }
});
// 处理用户报价
// 处理用户报价
// 处理用户报价
router.post('/bid/:id', isAuthenticated, async (req, res) => {
  let connection;
  try {
    console.log(`收到拍卖 ${req.params.id} 的报价请求，金额: ${req.body.bidAmount}`);
    
    const auctionId = req.params.id;
    const bidAmount = parseFloat(req.body.bidAmount);
    const bidderId = req.session.user.char_id;
    
    // 1. 基本参数校验
    if (!auctionId || isNaN(bidAmount) || bidAmount <= 0) {
      console.log('报价参数无效');
      return res.status(400).json({ error: '无效的报价参数' });
    }
    
    // 2. 获取数据库连接并开启事务
    connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // 3. 查询当前拍卖状态（带锁，防止竞态条件）
      const [auction] = await connection.execute(
        `SELECT end_time, current_highest_bid, status, buy_now_price, seller_id 
         FROM auction_item 
         WHERE auction_id = ? 
         FOR UPDATE`,  // 行锁，确保操作原子性
        [auctionId]
      );
      
      if (!auction || auction.length === 0) {
        throw { code: 404, message: '拍卖不存在' };
      }
      
      const currentAuction = auction[0];
      
      // 4. 业务逻辑验证
      if (currentAuction.status !== '上架中') {
        throw { code: 400, message: '拍卖已结束' };
      }
      
      if (new Date(currentAuction.end_time) <= new Date(currentAuction.last_bid_time)) {
        throw { code: 400, message: '拍卖已过期' };
      }
      
      if (bidAmount <= currentAuction.current_highest_bid) {
        throw { code: 400, message: '出价必须高于当前价格' };
      }
      
      if (currentAuction.seller_id === bidderId) {
        throw { code: 403, message: '不能对自己的拍卖品出价' };
      }
      
      // 5. 更新拍卖记录
      const [updateResult] = await connection.execute(
        `UPDATE auction_item 
         SET current_highest_bid = ?, 
             last_bidder_id = ?,
             last_bid_time = NOW()
         WHERE auction_id = ? 
           AND current_highest_bid < ? 
           AND status = '上架中'`,
        [bidAmount, bidderId, auctionId, bidAmount]
      );
      
      if (updateResult.affectedRows === 0) {
        throw { code: 409, message: '报价失败（竞态条件）' };
      }
      
      // 6. 检查是否达到一口价
      let auctionEnded = false;
      if (currentAuction.buy_now_price && bidAmount >= currentAuction.buy_now_price) {
        await connection.execute(
          `UPDATE auction_item 
           SET status = '已完成',
               end_time = NOW()
           WHERE auction_id = ?`,
          [auctionId]
        );
        auctionEnded = true;
      }
      
      // 7. 提交事务
      await connection.commit();
      
      // 8. 返回成功响应
      console.log('报价成功');
      return res.json({ 
        message: auctionEnded ? '恭喜！您已成功拍下该物品！' : '报价成功，当前为最高出价者',
        auctionEnded: auctionEnded
      });
      
    } catch (error) {
      // 回滚事务
      if (connection) await connection.rollback();
      
      // 处理业务异常
      if (error.code) {
        console.log(`业务错误: ${error.message}`);
        return res.status(error.code).json({ error: error.message });
      }
      
      // 未知错误
      throw error;
    } finally {
      // 释放连接
      if (connection) connection.release();
    }
    
  } catch (error) {
    console.error('报价异常:', error);
    
    // 在开发环境中返回详细的错误信息
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorDetails = isDevelopment ? 
      { error: '系统错误，请稍后重试', details: error.message, stack: error.stack } :
      { error: '系统错误，请稍后重试' };
    
    return res.status(500).json(errorDetails);
  }
});
module.exports = router;