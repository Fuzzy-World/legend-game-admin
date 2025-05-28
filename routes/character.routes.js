const express = require('express');
const router = express.Router();
const characterModel = require('../models/character.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 角色列表路由
router.get('/', isAuthenticated, async (req, res) => {
  console.log('[DEBUG] 进入角色管理路由'); // 新增调试日志
  try {
    const characters = await characterModel.getAllCharacters();
    res.render('characters/index', {
      title: '角色管理',
      characters,
      session: req.session,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    console.error('[ERROR] 角色列表获取失败:', error.stack); // 增强错误日志
    req.flash('error', '获取角色列表失败');
    res.redirect('/characters');
  }
});

// 创建角色路由
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    res.render('characters/create', {
      title: '创建角色',
      flash: {
        error: req.flash('error')
      },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载创建页面失败');
    res.redirect('/characters');
  }
});

// 新增POST路由处理
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const characterData = req.body;
    
    // 基础验证
    if (!characterData.account_id || !characterData.char_name) {
      req.flash('error', '账户ID和角色名称为必填字段');
      return res.redirect('/characters/create');
    }

    // 调用模型创建角色
    const charId = await characterModel.createCharacter(characterData);
    
    req.flash('success', '角色创建成功');
    res.redirect('/characters');
  } catch (error) {
    console.error('创建角色失败:', error);
    req.flash('error', `创建失败: ${error.message}`);
    res.redirect('/characters/create');
  }
});

// 编辑角色路由
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const character = await characterModel.getCharacterById(req.params.id);
    res.render('characters/edit', {
      title: '编辑角色',
      character,
      flash: {
        error: req.flash('error')
      },
      session: req.session
    });
  } catch (error) {
    req.flash('error', '角色信息获取失败');
    res.redirect('/characters');
  }
});

// 更新角色路由
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await characterModel.updateCharacter(req.params.id, req.body);
    req.flash('success', '角色更新成功');
    res.redirect('/characters');
  } catch (error) {
    req.flash('error', `更新失败: ${error.message}`);
    res.redirect(`/characters/edit/${req.params.id}`);
  }
});

// 删除角色路由
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const character = await characterModel.getCharacterById(req.params.id);
    res.render('characters/delete', {
      title: '确认删除角色',
      character,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '角色信息获取失败');
    res.redirect('/characters');
  }
});

router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await characterModel.deleteCharacter(req.params.id);
    req.flash('success', '角色删除成功');
    res.redirect('/characters');
  } catch (error) {
    req.flash('error', `删除失败: ${error.message}`);
    res.redirect('/characters');
  }
});

module.exports = router;