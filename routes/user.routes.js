const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
// 新增：引入拍卖模型
const auctionModel = require('../models/auction.model'); 
// 新增：引入角色模型
const characterModel = require('../models/character.model'); 
// 新增：引入 PlayerItem 模型
const PlayerItem = require('../models/player.item.model'); 

// 用户主页
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // 获取当前用户的角色列表
    const characters = await characterModel.getCharactersByAccountId(req.session.user.id) || [];

    const [user] = await db.query(`
        SELECT account_id, email, phone, is_banned 
        FROM account 
        WHERE account_id = ?
    `, [req.session.user.id]);

    res.render('user/characters', { 
        title: '玩家角色管理',
        user: user[0],
        currentAccountId: req.session.user.id,
        characters,  // 新增：传递角色数据
        flash: {
          success: req.flash('success'),
          error: req.flash('error')
        }
    });
});

// 玩家角色路由（修改此处）
router.get('/characters', async (req, res) => {  
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        // 获取当前用户的角色列表（通过账户ID查询），若查询失败则返回空数组
        const characters = await characterModel.getCharactersByAccountId(req.session.user.id) || [];  // 关键补充
        res.render('user/characters', { 
            title: '玩家角色管理',
            characters,  // 传递角色数据到模板（可能为空数组）
            currentAccountId: req.session.user.id,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取角色数据失败:', error);
        req.flash('error', '获取角色数据失败');
        res.redirect('/user');
    }
});

// 删除重复的示例路由配置
// router.get('/characters', (req, res) => {
//   res.render('user/characters', { title: '玩家角色管理' });
// });

router.get('/auctions', async (req, res) => {
  try {
    const auctions = await auctionModel.getActiveauction(); 
    res.render('user/auctions', { 
      title: '拍卖管理',
      auctions,
      session: req.session,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    console.error('获取拍卖数据失败:', error);
    req.flash('error', '获取拍卖数据失败');
    res.redirect('/user');
  }
});

router.get('/items', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const accountId = req.session.user.id;
        const items = await PlayerItem.getPlayerItemsByAccountId(accountId);
        res.render('user/items', { 
            title: '我的物品',
            items,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取物品数据失败:', error);
        req.flash('error', '获取物品数据失败');
        res.redirect('/user');
    }
});
module.exports = router;