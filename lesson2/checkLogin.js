function login(req, res, next) {
    if (req.session.user) {
        console.log('您已经登录');
        return res.redirect('back');
    }
    next();
}

function noLogin(req, res, next) {
    if (!req.session.user) {
        console.log('您需要登录');
        return res.redirect('/login');
    }
    next();
}

exports.login = login;
exports.noLogin = noLogin;