var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var moment = require('moment');
// 引入mongoose
var mongoose = require('mongoose');
// 引入连接
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var models = require('./models/models');
var User = models.User;
var Note = models.Note;

// 引入检测登录文件
var checkLogin = require('./checkLogin.js');

//生成一个express实例
var app = express();

// 使用mongoose连接服务
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error', console.error.bind(console, '连接数据库失败'));


// 建立 session 模型
app.use(session({
    key: 'session',
    secret: 'Keboard cat',
    cookie: {maxAge: 1000 * 60 * 60 * 1}, // 设置session的保存时间为1小时
    // 连接mongoDB数据库必要设置
    store: new MongoStore({
        db: 'notes',
        mongooseConnection: mongoose.connection
    }),
    resave: false,
    saveUninitialized: true
}));

//设置视图文件存放目录
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//设置静态文件存放目录
app.use(express.static(path.join(__dirname, 'public')));

// 解析urlencoded请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// 响应首页get请求
app.get('/', checkLogin.noLogin);
app.get('/', function(req, res) {
    Note.find({author: req.session.user.username})
        .exec(function(err, arts) {
            if (err) {
                console.log(err);
                return res.redirect('/');
            }
            res.render('index', {
                title: '笔记本列表',
                user: req.session.user,
                arts: arts,
                moment: moment
            });
        })
});

// app.get('/', checkLogin.login);
app.get('/reg', function(req, res) {
    res.render('register', {
        title: '注册',
        user: req.session.user,
        page: 'reg'
    })
})

app.post('/reg', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var passwordRepeat = req.body.passwordRepeat;

    if (password != passwordRepeat) {
        console.log('两次输入密码不一致');
        return res.redirect('/reg');
    }
    
    User.findOne({username:username}, function(err, user) {
        if (err) {
            console.log(err);
            return res.redirect('/reg');
        }
        if (user) {
            console.log('用户名已经存在');
            return res.redirect('/reg');
        }

        var md5 = crypto.createHash('md5');
        var md5Password = md5.update(password).digest('hex');

        var newUser = new User({
            username: username,
            password: md5Password
        });

        newUser.save(function(err, doc) {
            if (err) {
                consoel.log(err);
                return res.redirect('/reg');
            }
            console.log('注册成功');

            newUser.password = null;
            delete newUser.password;
            req.session.user = newUser;
            return res.redirect('/');
        });
    });
});

// app.get('/', checkLogin.login);
app.get('/login', function(req, res) {
    res.render('login', {
        title: '登录',
        user: req.session.user,
        page: 'login'
    });
});

app.post('/login', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    User.findOne({username:username}, function(err, user) {
        if (err) {
            console.log(err);
            return next(err);
        }
        if (!user) {
            console.log('用户不存在');
            return res.redirect('/login');
        }

        var md5 = crypto.createHash('md5');
        var md5Password = md5.update(password).digest('hex');
        if (user.password != md5Password) {
            console.log('密码错误');
            return res.redirect('/login');
        };

        console.log('登录成功');
        user.password = null;
        delete user.password;
        req.session.user = user;
        return res.redirect('/');
    });
});
// app.get('/', checkLogin.noLogin);
app.get('/quit', function(req, res) {
    req.session.user = null;
    console.log('quit success');
    return res.redirect('/login');
})

// app.get('/', checkLogin.noLogin);
app.get('/post', function(req, res) {
    res.render('post', {
        title: '发布',
        user: req.session.user
    })
});

app.post('/post', function(req, res) {
    var note = new Note({
        title: req.body.title,
        author: req.session.user.username,
        tag: req.body.tag,
        content: req.body.content
    });

    note.save(function(err, doc) {
        if (err) {
            console.log(err);
            return res.redirect('/post');
        }
        console.log('文章发表成功');
        return res.redirect('/');
    })
});

// app.get('/', checkLogin.noLogin);
app.get('/detail/:_id', function(req, res) {
    Note.findOne({_id: req.params._id})
        .exec(function(err, art) {
            if (err) {
                console.log(err);
                return res.redirect('/')
            }
            if (art) {
                res.render('detail', {
                    title: '笔记本详情',
                    user: req.session.user,
                    art: art,
                    moment: moment
                });
            }
        });
});

// 端口监听
app.listen(3000, function(req, res) {
    console.log(app.get('views'));
    console.log('app is running at port 3000');
})
