const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const flash = require('express-flash');
const ejsLayouts = require('express-ejs-layouts');
const itemRoutes = require('./routes/item.routes');
const monsterRoutes = require('./routes/monster.routes');
const playerItemRoutes = require('./routes/player.item.routes');
const userRouter = require('./routes/user.routes');
const achievementRoutes = require('./routes/achievement.routes');
const guildRoutes = require('./routes/guild.routes');


// 在app.js或入口文件中
const methodOverride = require('method-override');

// 配置method-override中间件

dotenv.config();

const app = express();

// 中间件配置（按顺序）
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(ejsLayouts);
app.use(methodOverride('_method'));
// 会话和flash中间件
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 3600000,
    httpOnly: true
  }
}));

app.use(flash());

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.use((req, res, next) => {
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

// 正确的测试连接方式
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] 数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('[DB] 数据库连接失败:', err.stack);
    process.exit(1);
  }
}

// 执行测试
testConnection();

// 全局变量，将数据库连接池传递给所有路由
app.locals.db = pool;

// 路由配置
app.use('/', require('./routes/auth.routes'));
app.use('/auction', require('./routes/auction.routes')); // 移至前面
app.use('/players', require('./routes/player.routes')); 
app.use('/items', require('./routes/item.routes'));
app.use('/drops', require('./routes/drop.routes'));
app.use('/characters', require('./routes/character.routes'));
app.use('/maps', require('./routes/map.routes'));
app.use('/monsters', require('./routes/monster.routes')); // 确保在拍卖路由之后
app.use('/player-items', require('./routes/player.item.routes'));
app.use('/user', require('./routes/user.routes'));
app.use('/achievements', require('./routes/achievement.routes'));
app.use('/guilds',require('./routes/guild.routes'));


// 404错误处理
app.use((req, res, next) => {
  res.status(404).render('error', { title: '404 Not Found', message: '页面未找到' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

