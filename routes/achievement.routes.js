const express = require('express');
const router = express.Router();
const achievementModel = require('../models/achievement.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 成就列表
router.get('/', isAuthenticated,isAdmin, async (req, res) => {
  try {
    const achievements = await achievementModel.getAllAchievements();
    res.render('achievements/index', { 
      title: '成就模板管理',
      achievements
    });
  } catch (error) {
    req.flash('error', '获取成就列表失败');
    res.redirect('/achievements');
  }
});

// 创建成就表单
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('achievements/create', { title: '创建成就模板' });
});

// 处理创建请求
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await achievementModel.createAchievement(req.body);
    req.flash('success', '成就创建成功');
    res.redirect('/achievements');
  } catch (error) {
    req.flash('error', error.message || '创建成就失败');
    res.redirect('/achievements/create');
  }
});

// 编辑成就表单
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const achievement = await achievementModel.getAchievementById(req.params.id);
    if (!achievement) {
      req.flash('error', '成就不存在');
      return res.redirect('/achievements');
    }
    res.render('achievements/edit', { 
      title: '编辑成就模板', 
      achievement 
    });
  } catch (error) {
    req.flash('error', '获取成就信息失败');
    res.redirect('/achievements');
  }
});
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await achievementModel.updateAchievement(req.params.id,req.body);
      req.flash('success', '成就更新成功');
      res.redirect('/achievements'); // 修改这里
    } catch (error) {
      req.flash('error', error.message || '更新成就失败');
      res.redirect(`/achievements/edit/${req.params.id}`); // 修改这里
    }
  });
  // 修改删除路由（原第53行附近）
  router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => { // 修改这里
      try {
          const achievement = await achievementModel.getAchievementById(req.params.id);
          if (!achievement) {
              req.flash('error', '成就不存在');
              return res.redirect('/achievements');
          }
          res.render('achievements/delete', { 
              title: '删除成就模板',
              achievement 
          });
      } catch (error) {
          req.flash('error', '获取成就信息失败');
          res.redirect('/achievements');
      }
  });
  
  router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
      try {
          // 修改这里，移除不必要的req.body参数
          await achievementModel.deleteAchievement(req.params.id); 
          req.flash('success', '成就删除成功');
          res.redirect('/achievements');
      } catch (error) {
          req.flash('error', error.message || '删除成就失败');
          res.redirect(`/achievements/delete/${req.params.id}`);
      }
  });


module.exports = router;