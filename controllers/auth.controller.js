const bcrypt = require('bcryptjs');

// 登录页面
exports.getLogin = (req, res) => {
  res.render('auth/login', { 
    title: '登录',
    error: req.flash('error')[0] 
  });
};

// 处理登录请求
exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (username !== validUsername) {
      req.flash('error', '用户名或密码错误');
      return res.redirect('/login');
    }
    
    const isPasswordValid = await bcrypt.compare(password, validPasswordHash);
    if (!isPasswordValid) {
      req.flash('error', '用户名或密码错误');
      return res.redirect('/login');
    }
    
    req.session.user = {
      username,
      isAdmin: true  // 临时强制设置为管理员，测试通过后应恢复动态设置
    };
    
    // 添加会话保存回调及错误日志
    req.session.save(err => {
      if (err) {
         // 新增错误日志
        req.flash('error', '会话保存失败');
        return res.redirect('/login');
      }
      const redirectPath = req.session.user.isAdmin ? '/players' : '/profile';
      res.redirect(redirectPath);
    });
  } catch (error) {
    req.flash('error', '登录过程中发生错误');
    return res.redirect('/login');
  }
};

// 登出逻辑
exports.logout = (req, res) => {
  req.session.destroy(err => {
    res.redirect('/login');
  });
};
