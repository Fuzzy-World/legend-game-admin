// 验证用户是否已登录
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    // 新增会话有效性验证日志
    if (!req.session.cookie.expires || new Date() < new Date(req.session.cookie.expires)) {
      console.log(`用户[${req.session.user.username}]已登录，会话有效`);  // 新增日志
      return next();
    }
  }
  // 新增会话过期日志
  console.log('用户未登录或会话已过期');  // 新增日志
  req.session.regenerate(() => {
    req.flash('error', '会话已过期，请重新登录');
    res.redirect('/login');
  });
}

// 验证用户是否为管理员
function isAdmin(req, res, next) {
  console.log(`检查用户[${req.session.user?.username}]的管理员权限`, req.session.user);  // 优化日志格式
  if (req.session.user && req.session.user.isAdmin) {
    console.log(`用户[${req.session.user.username}]是管理员，允许访问`);  // 新增日志
    return next();
  }
  console.log(`用户[${req.session.user?.username}]权限不足，重定向到登录页`);  // 新增日志
  req.session.destroy(() => {
    req.flash('error', '权限不足，请使用管理员账号登录');
    res.redirect('/login');
  });
}

module.exports = {
  isAuthenticated,
  isAdmin
};
