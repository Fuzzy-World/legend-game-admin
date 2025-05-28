// 验证用户是否已登录
const isAuthenticated = (req, res, next) => {
  // 新增路径日志
  console.log('[AUTH] 会话状态:', req.session.user ? '已登录' : '未登录'); // 新增会话状态日志
  
  if (req.session.user) {
    return next();
  }
  
  console.log('[AUTH] 重定向到登录页面'); // 新增重定向日志
  req.flash('error', '请先登录');
  res.redirect('/login');
};

// 验证用户是否为管理员
// 在现有中间件中添加参数校验
function isAdmin(req, res, next) {
  if (!req.session.user?.isAdmin) {
    console.log(`非法访问尝试: ${req.method} ${req.originalUrl}`);
    return res.status(403).redirect('/login');
  }
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin
};

// 视图文件验证
// 已确认视图目录存在以下文件：
// - <mcfile name="create.ejs" path="views/auction/create.ejs"></mcfile>
// - <mcfile name="edit.ejs" path="views/auction/edit.ejs"></mcfile>

// 权限中间件优化
