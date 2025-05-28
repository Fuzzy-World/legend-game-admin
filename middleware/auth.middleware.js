// 注意：实际项目中应使用更安全的认证方式，如Passport.js
module.exports = {
  // 验证用户是否已登录
  isAuthenticated: (req, res, next) => {
    console.log('认证中间件: 检查用户是否已登录');
    if (req.session.user) {
      next();
    } else {
      req.flash('error', '请先登录');
      res.redirect('/login');
    }
  },
  
  // 验证用户是否为管理员
  isAdmin: (req, res, next) => {
    console.log('认证中间件: 检查用户是否为管理员');
    if (req.session.user && req.session.user.isAdmin) {
      next();
    } else {
      req.flash('error', '需要管理员权限');
      res.redirect('/monsters');
    }
  }
};