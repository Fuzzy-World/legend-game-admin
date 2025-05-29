const express = require('express');
const router = express.Router();
const characterModel = require('../models/character.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 角色列表路由
router.get('/', isAuthenticated, async (req, res) => {
  console.log('[DEBUG] 进入角色管理路由');
  try {
    // 修正参数获取方式（GET请求应使用query而非body）
    const account_id = req.query.account_id;
    const characters = account_id 
      ? await characterModel.getCharactersByAccountId(account_id)
      : await characterModel.getAllCharacters();
      
    res.render('characters/index', {
      title: '角色管理',
      characters,
      session: req.session,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      },
      filterAccountId: account_id // 传递筛选值到视图
    });
  } catch (error) {
    console.error('[ERROR] 角色列表获取失败:', error.stack);
    req.flash('error', '获取角色列表失败');
    res.redirect('/characters');
  }
});

// 新增：创建角色页面的 GET 路由
// 修改后（移除 isAdmin 中间件）
router.get('/create', isAuthenticated, async (req, res) => {  // 仅保留 isAuthenticated
  try {
    // 从查询参数中获取可能携带的 account_id（例如从玩家详情页跳转时传递）
      const account_id = req.session.user.id;
    res.render('characters/create', { 
      title: '创建角色',
      flash: {
        error: req.flash('error') // 传递 flash 错误信息到模板
      },
      session: req.session,
      account_id: account_id // 新增：传递 account_id 到模板
    });
  } catch (error) {
    console.error('加载创建角色页面失败:', error);
    req.flash('error', '加载创建页面失败');
    res.redirect('/characters');
  }
});


// 修改后（移除 isAdmin 中间件）
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const characterData = req.body;
    
    // 基础验证
    if (!characterData.account_id || !characterData.char_name) {
      req.flash('error', '账户ID和角色名称为必填字段');
      return res.redirect('/characters/create');
    }
    
    // 新增账户存在性验证
    const accountExists = await characterModel.checkAccountExists(characterData.account_id);
    if (!accountExists) {
      req.flash('error', '该账户不存在');
      return res.redirect('/characters/create');
    }

    // 修改：检查同账户下角色名称是否重复
    const nameExists = await characterModel.checkNameExists(
      characterData.char_name, 
      characterData.account_id
    );
    if (nameExists) {
      req.flash('error', '同一账户下已存在该角色名称');
      return res.redirect('/characters/create');
    }

    // 调用模型创建角色
    const charId = await characterModel.createCharacter(characterData);
    
    req.flash('success', '角色创建成功');
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/characters');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`
        <script>
          
            window.location.href = '/user/characters'; 
          
        </script>
      `);
    }
  } catch (error) {
    console.error('创建角色失败:', error);
    req.flash('error', `创建失败: ${error.message.includes('封禁') ? error.message : '系统错误'}`);
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/characters');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`
        <script>
          
            window.location.href = '/user/characters'; 
          
        </script>
      `);
    }
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
// 在更新路由中添加参数验证
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const currentChar = await characterModel.getCharacterById(req.params.id);
    const characterData = req.body;
    
    // 当角色名称变更时进行唯一性检查（排除当前角色）
    if (characterData.char_name !== currentChar.char_name) {
      const nameExists = await characterModel.checkNameExists(characterData.char_name, req.params.id);
      if (nameExists) {
        req.flash('error', '角色名称已存在，请使用其他名称');
        return res.redirect(`/characters/edit/${req.params.id}`);
      }
    }

    // 保持原有更新逻辑
    await characterModel.updateCharacter(req.params.id, {
      char_name: req.body.char_name,
      level: req.body.level || 1,
      hp_max: req.body.hp_max || 100,
      attack: req.body.attack || 10,
      defense: req.body.defense || 5
    });
    req.flash('success', '角色更新成功');
    res.redirect('/characters');
  } catch (error) {
    req.flash('error', `更新失败: ${error.message}`);
    res.redirect(`/characters/edit/${req.params.id}`);
  }
});

// 删除角色路由
router.get('/delete/:id', isAuthenticated,  async (req, res) => {
  try {
    const character = await characterModel.getCharacterById(req.params.id);
    res.render('characters/delete', {
      title: '确认删除角色',
      character,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '角色信息获取失败');
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/characters');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`
        <script>
          
            window.location.href = '/user/characters'; // 默认回退到用户仪表盘
          
        </script>
      `);
    }
  }
});

router.post('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await characterModel.deleteCharacter(req.params.id);
    req.flash('success', '角色删除成功');
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/characters');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`
        <script>
          
            window.location.href = '/user/characters'; // 默认回退到用户仪表盘
          
        </script>
      `);
    }
  } catch (error) {
    req.flash('error', `删除失败: ${error.message}`);
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/characters');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`
        <script>
          
            window.location.href = '/user/characters'; // 默认回退到用户仪表盘
          
        </script>
      `);
    }
  }
});

module.exports = router;