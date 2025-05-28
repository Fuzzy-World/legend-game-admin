const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// 登录页面
router.get('/login', authController.getLogin);

// 处理登录请求
router.post('/login', authController.postLogin);

// 登出
router.get('/logout', authController.logout);

// 添加根路径重定向
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/players');
  } else {
    res.redirect('/login');
  }
});

module.exports = router;