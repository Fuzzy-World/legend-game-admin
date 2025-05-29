const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const db = require('../config/db.config');
const bcrypt = require('bcryptjs'); // 新增bcrypt引入

// 登录页面
router.get('/login', authController.getLogin);

// 处理登录请求
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // 查询普通用户
        const [userRows] = await db.query(`
            SELECT * FROM account 
            WHERE email = ? AND phone = ?
        `, [email, password]);
        
        const user = userRows[0];
        
        if (user) {
            if (user.is_banned === 1) {
                req.flash('error', '该账号已被封禁');
                return res.redirect('/login');
            }
            
            // 查询用户角色
            const [characterRows] = await db.query(`
                SELECT char_id 
                FROM \`character\` 
                WHERE account_id = ?  
            `, [user.account_id]);
        
            // 新增：检查角色是否存在
            if (characterRows.length === 0) {
                req.session.user = {
                    id: user.account_id,
                    email: user.email,
                    isAdmin: false
                };
                return req.session.save(err => {
                    if (err) throw err;
                    res.redirect(`/characters/create?account_id=${user.account_id}`);
                });
            }
        
            // 原有角色存在时的处理逻辑
            const userCharacter = characterRows[0];
            req.session.user = {
                id: user.account_id,
                char_id: userCharacter.char_id,
                email: user.email,
                isAdmin: false
            };
            
            return req.session.save(err => {
                if (err) throw err;
                res.redirect('/user/characters');
            });
        }
        
        // 查询管理员用户
        const validAdminUsername = process.env.ADMIN_USERNAME || 'admin';
        const validAdminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        
        if (email === validAdminUsername) {
            const isPasswordValid = await bcrypt.compare(password, validAdminPasswordHash);
            
            if (isPasswordValid) {
                // 管理员登录成功
                req.session.user = {
                    email: validAdminUsername,
                    isAdmin: true,
                    char_id: 'master',
                    id : 0 // 管理员没有角色
                };
                
                return req.session.save(err => {
                    if (err) throw err;
                    res.redirect('/players'); // 管理员重定向到玩家管理页
                });
            }
        }
        
        // 登录失败
        req.flash('error', '用户名或密码错误');
        res.redirect('/login');
        
    } catch (error) {
        console.error('登录错误:', error);
        req.flash('error', '登录过程中发生错误');
        res.redirect('/login');
    }
});

// 登出
router.get('/logout', authController.logout);

// 添加根路径重定向
router.get('/', (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
        res.redirect('/players'); // 管理员
      } else if (req.session.user) {
        res.redirect('/user/characters'); // 普通用户
      } else {
        res.redirect('/login');
      }
});

module.exports = router;
