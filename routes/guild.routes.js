const express = require('express');
const router = express.Router();
const guildModel = require('../models/guild.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 日志函数
function logRequest(req, message) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${message}`);
}

// 公会列表
router.get('/', isAuthenticated, isAdmin, async (req, res, next) => {
  logRequest(req, '获取公会列表');
  try {
    const guilds = await guildModel.getAllGuilds();
    logRequest(req, `成功获取 ${guilds.length} 个公会`);
    res.render('guilds/index', { 
      title: '公会管理',
      guilds
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取公会列表错误:`, error);
    req.flash('error', '获取公会列表失败');
    res.redirect('/guilds');
  }
});

router.get('/create', isAuthenticated ,isAdmin,async (req, res) => {
    res.render('guilds/create', {
      title: '创建公会',
      currentCharId: req.session.user.char_id ,
      success: req.flash('success')[0] || null, // 确保传递 success 变量
        error: req.flash('error')[0] || null// 从认证信息获取当前角色ID
    });
  });
  
  // 处理创建公会请求
  router.post('/create', isAuthenticated, async (req, res) => {
    try {
      const guildData = {
        guild_name: req.body.guild_name,
        founder_id: parseInt(req.body.founder_id, 10) // 确保转为数字
      };
      
      // 调用模型创建公会
      const guildId = await guildModel.createGuild(guildData);
      
      req.flash('success', '公会创建成功');
      res.redirect(`/guilds`);
    } catch (error) {
      req.flash('error', error.message);
      res.redirect('/guilds');
    }
  });
// 编辑公会表单
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res, next) => {
  logRequest(req, `获取公会 ${req.params.id} 信息用于编辑`);
  try {
    const guild = await guildModel.getGuildById(req.params.id);
    if (!guild) {
      console.error(`[${new Date().toISOString()}] 公会 ${req.params.id} 不存在`);
      req.flash('error', '公会不存在');
      return res.redirect('/guilds');
    }
    logRequest(req, `成功获取公会 ${req.params.id} 信息`);
    res.render('guilds/edit', { 
      title: '编辑公会', 
      guild 
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取公会 ${req.params.id} 信息错误:`, error);
    req.flash('error', '获取公会信息失败');
    res.redirect('/guilds');
  }
});

// 更新公会
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  logRequest(req, `处理公会 ${req.params.id} 更新请求`);
  try {
    console.log('更新公会数据:', req.body);
    const result = await guildModel.updateGuild(req.params.id, req.body);
    if (!result) {
      console.error(`[${new Date().toISOString()}] 公会 ${req.params.id} 更新失败（可能不存在）`);
      req.flash('error', '公会不存在，更新失败');
      return res.redirect('/guilds');
    }
    logRequest(req, `公会 ${req.params.id} 更新成功`);
    req.flash('success', '公会更新成功');
    res.redirect('/guilds');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 更新公会 ${req.params.id} 错误:`, error);
    req.flash('error', error.message || '更新公会失败');
    res.redirect(`/guilds/edit/${req.params.id}`);
  }
});

// 删除确认
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  logRequest(req, `获取公会 ${req.params.id} 信息用于删除确认`);
  try {
    const guild = await guildModel.getGuildById(req.params.id);
    if (!guild) {
      console.error(`[${new Date().toISOString()}] 公会 ${req.params.id} 不存在`);
      req.flash('error', '公会不存在');
      return res.redirect('/guilds');
    }
    logRequest(req, `成功获取公会 ${req.params.id} 信息用于删除确认`);
    res.render('guilds/delete', { 
      title: '删除公会',
      guild 
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取公会 ${req.params.id} 信息错误:`, error);
    req.flash('error', '获取公会信息失败');
    res.redirect('/guilds');
  }
});

// 执行删除
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  logRequest(req, `处理公会 ${req.params.id} 删除请求`);
  try {
    const result = await guildModel.deleteGuild(req.params.id);
    if (!result) {
      console.error(`[${new Date().toISOString()}] 公会 ${req.params.id} 删除失败（可能不存在）`);
      req.flash('error', '公会不存在，删除失败');
      return res.redirect('/guilds');
    }
    logRequest(req, `公会 ${req.params.id} 删除成功`);
    req.flash('success', '公会删除成功');
    res.redirect('/guilds');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 删除公会 ${req.params.id} 错误:`, error);
    req.flash('error', error.message || '删除公会失败');
    res.redirect(`/guilds/delete/${req.params.id}`);
  }
});

module.exports = router;