const express = require('express');
const router = express.Router();
const PlayerItem = require('../models/player.item.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 物品实例列表
router.get('/', isAuthenticated, async (req, res) => {
    try {
        let items;
        // 管理员获取所有物品，普通用户仅获取自己account_id的物品
        if (req.session.user.isAdmin) {
            items = await PlayerItem.getAllPlayerItems();
        } else {
            const accountId = req.session.user.id;
            items = await PlayerItem.getPlayerItemsByAccountId(accountId);
        }
        
        res.render('players-items/index', { 
            title: '玩家物品管理',
            items,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取物品列表失败:', error);
        req.flash('error', '获取物品列表失败');
        res.redirect('/player-items');
    }
});

// 创建页面
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [characters] = await req.app.locals.db.execute('SELECT char_id, char_name FROM `character`');
    const [items] = await req.app.locals.db.execute('SELECT item_id, item_name FROM item_template');
    res.render('players-items/create', {
      title: '创建新物品实例',
      flash: { error: req.flash('error') },
      session: req.session,
      characters,
      items
    });
  } catch (error) {
    console.error('加载创建页面失败:', error);
    req.flash('error', '无法加载创建页面');
    res.redirect('/player-items');
  }
});

// 处理创建
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await PlayerItem.createPlayerItem(req.body);
    req.flash('success', '物品实例创建成功');
    res.redirect('/player-items');
  } catch (error) {
    req.flash('error', error.message || '创建物品实例失败');
    res.redirect('/player-items/create');
  }
});

// 编辑页面（修改中间件并添加权限验证）
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      req.flash('error', '无效的物品ID');
      if (req.session.user && req.session.user.isAdmin) {
        // 管理员继续使用原重定向
        return res.redirect('/player-items');
      } else {
        // 普通用户返回上一页或自定义页面
        res.send(`<script> window.location.href = '/user/items'; </script>`);
      }
      
    }
    const item = await PlayerItem.getPlayerItemById(id);
    if (!item) {
      req.flash('error', '物品实例不存在');
      if (req.session.user && req.session.user.isAdmin) {
        // 管理员继续使用原重定向
        return res.redirect('/player-items');
      } else {
        // 普通用户返回上一页或自定义页面
        res.send(`<script> window.location.href = '/user/items'; </script>`);
      }
    }
    // 权限验证：非管理员只能操作自己的物品
    if (!req.session.user.isAdmin && item.account_id !== req.session.user.id) {
      req.flash('error', '无权限编辑他人物品');
      res.send(`<script> window.location.href = '/user/items'; </script>`);
    }
    const [characters] = await req.app.locals.db.execute('SELECT char_id, char_name, account_id FROM `character`');
    const [items] = await req.app.locals.db.execute('SELECT item_id, item_name FROM item_template');
    res.render('players-items/edit', {
      title: '编辑物品实例',
      item,
      characters,
      items,
      flash: { error: req.flash('error') },
      session: req.session
    });
  } catch (error) {
    console.error('渲染编辑页面失败:', error);
    req.flash('error', '渲染编辑页面失败');
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      res.redirect('/player-items');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`<script> window.location.href = '/user/items'; </script>`);
    }
  }
});

// 处理更新（修改中间件并添加权限验证）
router.put('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      req.flash('error', '无效的物品ID');
      if (req.session.user && req.session.user.isAdmin) {
        // 管理员继续使用原重定向
        return res.redirect('/player-items');
      } else {
        // 普通用户返回上一页或自定义页面
        res.send(`<script> window.location.href = '/user/items'; </script>`);
      }
      
    }
    
    const currentItem = await PlayerItem.getPlayerItemById(id);
    if (!currentItem) {
      req.flash('error', '物品实例不存在');
      if (req.session.user && req.session.user.isAdmin) {
        // 管理员继续使用原重定向
        return res.redirect('/player-items');
      } else {
        // 普通用户返回上一页或自定义页面
        res.send(`<script> window.location.href = '/user/items'; </script>`);
      }
    }
    // 权限验证：非管理员只能操作自己的物品
    if (!req.session.user.isAdmin && currentItem.account_id !== req.session.user.id) {
      req.flash('error', '无权限更新他人物品');
      if (req.session.user && req.session.user.isAdmin) {
        // 管理员继续使用原重定向
        return res.redirect('/player-items');
      } else {
        // 普通用户返回上一页或自定义页面
        res.send(`<script> window.location.href = '/user/items'; </script>`);
      }
    }
    
    const success = await PlayerItem.updatePlayerItem(id, req.body);
    
    if (success) {
      const updatedItem = await PlayerItem.getPlayerItemById(id);
      if (currentItem.is_equipped !== updatedItem.is_equipped) {
        console.log(`is_equipped更新: ${currentItem.is_equipped} → ${updatedItem.is_equipped}`);
      } else {
        console.log(`is_equipped未变更: ${updatedItem.is_equipped}`);
      }
      req.flash('success', '物品实例更新成功');
    } else {
      req.flash('error', '物品更新失败，可能没有实际变更');
    }
    
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      return res.redirect('/player-items');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`<script> window.location.href = '/user/items'; </script>`);
    }
  } catch (error) {
    console.error('更新物品实例异常:', error);
    req.flash('error', error.message || '更新物品时发生异常');
    if (req.session.user && req.session.user.isAdmin) {
      // 管理员继续使用原重定向
      return res.redirect('/player-items');
    } else {
      // 普通用户返回上一页或自定义页面
      res.send(`<script> window.location.href = '/user/items'; </script>`);
    }
  }
});

// 删除确认页面（修改中间件并添加权限验证）
router.get('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      req.flash('error', '无效的物品ID');
      return res.redirect('/player-items');
    }
    const item = await PlayerItem.getPlayerItemById(id);
    if (!item) {
      req.flash('error', '物品实例不存在');
      return res.redirect('/player-items');
    }
    // 权限验证：非管理员只能操作自己的物品
    if (!req.session.user.isAdmin && item.account_id !== req.session.user.id) {
      req.flash('error', '无权限删除他人物品');
      return res.redirect('/player-items');
    }
    res.render('players-items/delete', {
      title: '确认删除物品',
      item,
      session: req.session,
      flash: { error: req.flash('error') }
    });
  } catch (error) {
    req.flash('error', '获取物品信息失败');
    res.redirect('/player-items');
  }
});

// 处理删除（修改中间件并添加权限验证）
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const currentItem = await PlayerItem.getPlayerItemById(id);
    if (!currentItem) {
      req.flash('error', '物品实例不存在');
      return res.redirect('/player-items');
    }
    // 权限验证：非管理员只能操作自己的物品
    if (!req.session.user.isAdmin && currentItem.account_id !== req.session.user.id) {
      req.flash('error', '无权限删除他人物品');
      return res.redirect('/player-items');
    }
    const success = await PlayerItem.deletePlayerItem(id);
    if (success) {
      req.flash('success', '物品实例删除成功');
    } else {
      req.flash('error', '物品删除失败');
    }
    res.redirect('/player-items');
  } catch (error) {
    req.flash('error', error.message || '删除物品失败');
    res.redirect('/player-items');
  }
});

module.exports = router;
