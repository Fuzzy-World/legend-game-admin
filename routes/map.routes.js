const express = require('express');
const router = express.Router();
const mapModel = require('../models/map.model');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// 地图列表
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const maps = await mapModel.getAllMaps();
    res.render('map/index', {
      title: '地图管理',
      maps,
      session: req.session,
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    req.flash('error', '获取地图列表失败');
    res.redirect('/maps');
  }
});

// 创建页面
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('map/create', {
    title: '创建地图',
    flash: { error: req.flash('error') },
    session: req.session
  });
});

// 创建提交
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // 添加参数验证
    const requiredFields = ['map_name', 'map_type', 'is_safe_zone', 'spawn_config', 'unlock_level', 'icon_path'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new Error(`缺少必要字段：${field}`);
      }
    }
    
    // 增强JSON验证逻辑
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(req.body.spawn_config);
      if (!parsedConfig.monsters || !Array.isArray(parsedConfig.monsters)) {
        throw new Error("必须包含 monsters 数组");
      }
    } catch (e) {
      throw new Error(`刷怪配置格式错误：${e.message}`);
    }

    const mapId = await mapModel.createMap({
      ...req.body,
      is_safe_zone: parseInt(req.body.is_safe_zone),
      spawn_config: JSON.stringify(parsedConfig) // 存储标准化的JSON
    });
    req.flash('success', '地图创建成功');
    res.redirect('/maps');
  } catch (error) {
    req.flash('error', `创建失败：${error.message}`);
    res.redirect('/maps/create');
  }
});

// 编辑页面
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const map = await mapModel.getMapById(req.params.id);
    res.render('map/edit', {
      title: '编辑地图',
      map,
      session: req.session,
      flash: { error: req.flash('error') }
    });
  } catch (error) {
    req.flash('error', '获取地图信息失败');
    res.redirect('/maps');
  }
});

// 编辑提交
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // 新增参数验证
    const requiredFields = ['map_name', 'map_type', 'is_safe_zone', 'spawn_config', 'unlock_level', 'icon_path'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new Error(`缺少必要字段：${field}`);
      }
    }

    // 新增JSON验证
    try {
      JSON.parse(req.body.spawn_config);
    } catch (e) {
      throw new Error("刷怪配置必须是有效的JSON格式");
    }

    const success = await mapModel.updateMap(req.params.id, {
      ...req.body,
      is_safe_zone: parseInt(req.body.is_safe_zone) // 转换radio值
    });
    if (success) {
      req.flash('success', '地图更新成功');
    } else {
      req.flash('error', '更新失败');
    }
    res.redirect('/maps');
  } catch (error) {
    req.flash('error', `更新失败：${error.message}`);
    res.redirect(`/maps/edit/${req.params.id}`);
  }
});

// 删除确认
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const map = await mapModel.getMapById(req.params.id);
    res.render('map/delete', {
      title: '删除地图',
      map,
      session: req.session
    });
  } catch (error) {
    req.flash('error', '加载删除页面失败');
    res.redirect('/maps');
  }
});

// 执行删除
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const success = await mapModel.deleteMap(req.params.id);
    if (success) {
      req.flash('success', '地图删除成功');
      return res.redirect('/maps'); // 添加return，避免后续代码执行
    } else {
      req.flash('error', '删除失败');
      return res.redirect('/maps'); // 失败时也立即重定向
    }
  } catch (error) {
    req.flash('error', `删除失败：${error.message}`);
    return res.redirect('/maps'); // 异常时同样添加return
  }
});

router.post('/some-route', async (req, res) => {
  try {
    const result = await someAsyncOperation();
    if (!result) {
      res.redirect('/not-found');  // First response
      return; // Crucial return statement
    }
    res.json(result); // Single response
  } catch (error) {
    console.error(error);
    res.status(500).redirect('/error'); // Error response
  }
});
module.exports = router;