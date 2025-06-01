const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
// 新增：引入拍卖模型
const auctionModel = require('../models/auction.model'); 
// 新增：引入角色模型
const characterModel = require('../models/character.model'); 
// 新增：引入 PlayerItem 模型
const PlayerItem = require('../models/player.item.model'); 
const achievementModel = require('../models/achievement.model');
const guildModel = require('../models/guild.model');
const mailModel = require('../models/mail.model');

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
        const char_Id = req.session.user.char_id;
        const items = await PlayerItem.getPlayerItemsByAccountId(char_Id);
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

// 新增邮件路由
router.get('/mails', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const mails = await mailModel.getMailsByCharId(req.session.user.char_id);
        res.render('user/mails', {
            title: '我的邮件',
            mails,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取邮件数据失败:', error);
        req.flash('error', '获取邮件数据失败');
        res.redirect('/user');
    }
});

// 新增邮件详情路由
router.get('/mails/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const mail = await mailModel.getMailById(req.params.id, req.session.user.char_id);
        if (!mail) {
            req.flash('error', '邮件不存在或无权查看');
            return res.redirect('/user/mails');
        }
        res.render('user/mail', {
            title: '邮件详情',
            mail,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取邮件详情失败:', error);
        req.flash('error', '获取邮件详情失败');
        res.redirect('/user/mails');
    }
});

// 新增成就路由
router.get('/achievements', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const achievements = await achievementModel.getAchievementsByChar_Id(req.session.user.char_id);
        res.render('user/achievements', { 
            title: '我的成就',
            achievements,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取成就数据失败:', error);
        req.flash('error', '获取成就数据失败');
        res.redirect('/user');
    }
});

// 新增公会路由
router.get('/guilds', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const guilds = await guildModel.getGuildsByChar_Id(req.session.user.char_id);
        res.render('user/guild', {
            title: '我的公会',
            guilds,
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('获取公会数据失败:', error);
        req.flash('error', '获取公会数据失败');
        res.redirect('/user');
    }
});

// 新增邮件创建表单路由（GET请求）
router.get('/mails_create', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        res.render('user/mails_create', {
            title: '撰写新邮件',
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('访问邮件创建页面失败:', error);
        req.flash('error', '访问邮件创建页面失败');
        res.redirect('/user/mails');
    }
});
router.post('/mails_create', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const mailData = {
            sender_id: req.session.user.char_id,
            receiver_id: req.body.receiver_id,
            title: req.body.title,
            content: req.body.content,
            attachments: req.body.attachments || []
        };

        await mailModel.createMail(mailData);
        req.flash('success', '邮件发送成功');  // 确保此处设置成功消息
        res.redirect('/user/mails');
    } catch (error) {
        console.error('邮件发送失败:', error);
        req.flash('error', `邮件发送失败: ${error.message}`);  // 错误消息包含具体原因
        res.redirect('/user/mails/create');  // 失败时重定向回创建页
    }
});
module.exports = router;