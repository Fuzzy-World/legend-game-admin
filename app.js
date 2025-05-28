const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const flash = require('express-flash'); // 新增引入
const itemRoutes = require('./routes/item.routes');

dotenv.config();

const app = express();

// 中间件配置（按顺序）
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 会话和flash中间件
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 3600000,
    httpOnly: true  // 添加httpOnly增强安全性
  }
}));
app.use(flash());

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
  // 把 session 对象传递给所有视图
  res.locals.session = req.session;
  next();
});
// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    console.log('数据库连接成功');
    connection.release();
  })
  .catch(err => {
    console.error('数据库连接失败: ', err);
  });

// 全局变量，将数据库连接池传递给所有路由
app.locals.db = pool;

// 路由配置
app.use('/', require('./routes/auth.routes'));
app.use('/players', require('./routes/player.routes'));
app.use('/items', require('./routes/item.routes'));
app.use('/drops', require('./routes/drop.routes'));
app.use('/auction', require('./routes/auction.routes'));
app.use('/characters', require('./routes/character.routes'));

// 添加日志，查看未匹配的路由
app.use((req, res, next) => {

  next();
});

/// 新增请求追踪中间件
app.use((req, res, next) => {
  
  next();
});

// 404错误处理
app.use((req, res, next) => {
  res.status(404).render('error', { title: '404 Not Found', message: '页面未找到' });
});
// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});


