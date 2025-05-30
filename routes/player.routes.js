// 新增数据库引用
const db = require('../config/db.config');
const express = require('express');
const router = express.Router();
const playerModel = require('../models/player.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');


router.get('/', isAuthenticated, isAdmin,async (req, res) => {  // 移除了isAdmin中间件
  try {
    const players = await playerModel.getAllPlayers();
    // 获取 flash 消息
    const flash = {
      success: req.flash('success'),
      error: req.flash('error')
    };
    res.render('players/index', { 
      title: '玩家管理',
      players,
      // 添加权限状态传递
      session: req.session,
      // 传递 flash 消息
      flash
    });
  } catch (error) {
    req.flash('error', '获取玩家列表失败');
    res.redirect('/players');
  }
});

router.get('/create', isAuthenticated, async (req, res) => {  // 移除isAdmin
  try {
    // 获取 flash 消息
    const flash = {
      error: req.flash('error')
    };
    
    // 添加 session: req.session 传递会话信息
    res.render('players/create', { 
      title: '创建玩家',
      flash,
      session: req.session  // 新增传递 session 对象
    });
  } catch (error) {
    req.flash('error', '无法加载创建页面');
    res.redirect('/players');
  }
});

// 处理创建玩家的 POST 请求（新增邮箱唯一性验证）
router.post('/create', isAuthenticated, async (req, res) => {  // 移除isAdmin
  try {
    const playerData = req.body;
    
    // 验证必填字段
    if (!playerData.account_id || !playerData.email || !playerData.phone) {
      req.flash('error', '账户ID、邮箱和电话为必填字段');
      return res.redirect('/players/create');
    }

    // 新增：检查电话号码是否已存在（原有逻辑）
    const phoneExists = await playerModel.checkPhoneExists(playerData.phone);
    if (phoneExists) {
      req.flash('error', `电话号码 ${playerData.phone} 已被注册，请更换`);
      return res.redirect('/players/create');
    }

    // 新增：检查邮箱是否已存在
    const emailExists = await playerModel.checkEmailExists(playerData.email);
    if (emailExists) {
      req.flash('error', `邮箱 ${playerData.email} 已被注册，请更换`);
      return res.redirect('/players/create');
    }

    const playerId = await playerModel.createPlayer(playerData);
    req.flash('success', '玩家创建成功');
    res.redirect('/players');
  } catch (error) {
    console.error('创建玩家失败具体原因:', error);
    req.flash('error', `创建玩家失败：${error.message || '未知错误'}`);
    res.redirect('/players/create');
  }
});

// 显示编辑玩家表单（修正后）
router.get('/edit/:id', isAuthenticated, async (req, res) => {  // 移除isAdmin
  try {
    // 1. 验证ID是否存在且为有效数字
    const playerId = req.params.id;
    if (!playerId || isNaN(Number(playerId))) {
      req.flash('error', '无效的玩家ID，请检查链接');
      return res.redirect('/players');
    }

    // 2. 查询玩家是否存在
    const player = await playerModel.getPlayerById(playerId);
    if (!player) {
      req.flash('error', '玩家不存在或已被删除');
      return res.redirect('/players');
    }

    // 3. 传递session和flash消息（确保header.ejs正常渲染）
    const flash = { error: req.flash('error') };
    res.render('players/edit', { 
      title: '编辑玩家',
      player,
      session: req.session,
      flash
    });
  } catch (error) {
    req.flash('error', '获取玩家信息失败：' + error.message);
    res.redirect('/players');
  }
});

// 处理编辑玩家请求（修正后）
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const playerId = req.params.id;
    const playerData = req.body;
    
    // 1. 获取目标玩家信息
    const player = await playerModel.getPlayerById(playerId);
    if (!player) {
      req.flash('error', '玩家不存在');
      return res.redirect('/players');
    }

    // 2. 校验当前用户account_id与目标玩家account_id是否一致
    const currentAccountId = req.session.user.id;  // 从会话获取当前用户account_id
    if (player.account_id !== currentAccountId) {
      req.flash('error', '无权限操作其他账户的玩家');
      return res.redirect('/players');
    }

    // 3. 执行更新（原有逻辑）
    const success = await playerModel.updatePlayer(playerId, playerData);
    if (success) {
      req.flash('success', '玩家信息更新成功');
    } else {
      req.flash('error', '未找到需要更新的玩家或数据未变化');
    }
    res.redirect('/players');
  } catch (error) {
    req.flash('error', `更新失败：${error.message}`);
    res.redirect('/players');
  }
});

// 显示删除确认页面（修正后）
router.get('/delete/:id', isAuthenticated, async (req, res) => {  // 移除isAdmin
  try {
    const player = await playerModel.getPlayerById(req.params.id);
    if (!player) {
      req.flash('error', '玩家不存在');
      return res.redirect('/players');
    }
    res.render('players/delete', { 
      title: '确认删除玩家',
      player,
      flash: { error: req.flash('error') },
      session: req.session  // 新增传递 session 对象
    });
  } catch (error) {
    req.flash('error', '加载删除页面失败');
    res.redirect('/players');
  }
});

// 处理实际删除操作
router.post('/delete/:id', isAuthenticated, async (req, res) => {  // 移除isAdmin
  try {
    const success = await playerModel.deletePlayer(req.params.id);
    if (success) {
      // 移除以下多余的拍卖行删除操作（已在模型层处理）
      // await db.execute(...);
      req.flash('success', '玩家及其关联数据删除成功');
    } else {
      req.flash('error', '玩家删除失败');
    }
    res.redirect('/players');
  } catch (error) {
    console.error('删除失败详情:', error);
    const errorMessage = error.message.includes('foreign key') 
      ? '存在未处理的关联数据，请检查拍卖行、角色或物品数据' 
      : error.message;
    req.flash('error', `删除失败：${errorMessage}`);
    res.redirect('/players');
  }
});

module.exports = router;