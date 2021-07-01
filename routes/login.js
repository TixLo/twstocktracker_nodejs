var express = require('express');
var logger = require('log4js').getLogger();
var router = express.Router();
var stockdb = require('../controller/stockdb.js');
var cookies = require('./cookies.js');
var conn = require('./conn.js');

var redirect = function(res, url) {
    res.statusCode=302;
    res.setHeader('Location',url);
    return res.end();
}

var homePage = '/stock/monitor';

router.get('/', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    // temporarily for adsense
    cookies.create(res, 'tt');
    redirect(res, homePage);
    return;

    res.clearCookie('profile');
    if (await cookies.check(req.cookies) == true) {
        redirect(res,homePage);
    }
    else {
        redirect(res, '/login');
    }
});

router.get('/login', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    //temporarily for adsense
    cookies.create(res, 'tt');
    redirect(res, homePage);
    return;
    //res.render('login');
});

router.get('/logout', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('logout from ' + ip);
    res.clearCookie('profile');
    res.render('login');
});

router.get('/registry', function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('registry from ' + ip);
    res.render('registry');
});

router.post('/dologin', async function(req, res) {
    logger.info('dologin');
    logger.info(req.body);
    if (req.body.username == undefined || 
        req.body.password == undefined) {
        res.render('loginFailure', {msg: '不合法的帳號密碼,請重新登入或註'});
        return;
    }

    if (req.body.username.length == 0 ||
        req.body.password.length == 0) {
        res.render('loginFailure', {msg: '不合法的帳號密碼,請重新登入或註'});
        return;
    }

    var ret = await stockdb.getUserByName(req.body.username);
    logger.info(ret);
    logger.info(req.body);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        redirect(res, '/registry');
        return res.end();
    }
    else if (ret.data[0].tracker_passwd != req.body.password) {
        res.render('passwordFailure');
        return res.end();
    }
    else {
        // setup cookies
        cookies.create(res, req.body.username);
        redirect(res, homePage);
    }
});

router.post('/doregistry', async function(req, res) {
    logger.info('registry');
    logger.info(req.body);
    if (req.body.username == undefined || 
        req.body.password == undefined ||
        req.body.email == undefined) {
        res.render('loginFailure', {msg: '註冊資料沒有填寫完整'});
        return;
    }

    if (req.body.username.length == 0 ||
        req.body.password.length == 0 ||
        req.body.email.length == 0) {
        res.render('loginFailure', {msg: '註冊資料沒有填寫完整'});
        return;
    }

    if (req.body.password != req.body.password2) {
        res.render('loginFailure', {msg: '密碼不一致'});
        return;
    }

    if (req.body.username.indexOf('<') >= 0 ||
        req.body.password.indexOf('<') >= 0) {
        res.render('loginFailure', {msg: '帳號或密碼不合法'});
        return;
    }

    var ret = await stockdb.addUser(req.body.username, req.body.password, req.body.email);
    if (ret.code == 'ERROR') {
        res.render('registryFailure');
        return;
    }
    else {
        conn.broadcast('delUsersOK', {});
        redirect(res, '/');
    }
});

module.exports = router;
