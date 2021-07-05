var express = require('express');
var logger = require('log4js').getLogger();
var router = express.Router();
var stockdb = require('../controller/stockdb.js');
var cookies = require('./cookies.js');
var conn = require('./conn.js');
var TWSE = require('../controller/TWSE.js');

var redirect = function(res, url) {
    res.statusCode=302;
    res.setHeader('Location',url);
    return res.end();
}

var homePage = '/stock/monitor';

router.get('/clearcookie', async function(req, res, next) {
    res.clearCookie('profile');
    res.end('OK');
});

router.get('/', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    
    if (await cookies.check(req.cookies) == true) {
        logger.info('get cookies');
        let showtutorial = false;
        if (req.query != undefined && req.query.showtutorial != undefined) {
            showtutorial = true;
        }

        res.render('monitor', {
            username: req.cookies.profile.username,
            showtutorial: showtutorial
        });
    }
    else {
        res.render('monitor', {
            username: 'unknown',
            showtutorial: false
        });
    }
});

router.post('/login', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    //login from ::ffff:222.99.61.72
    logger.info(req.body);

    var username = req.body.name;
    //if (req.body.checked == 'true') {
    //    let base64IP = Buffer.from(ip).toString('base64');
    //    username = ip + '-' + req.body.name;
    //}

    var ret = await stockdb.getUserByName(username);
    var showtutorial = false;
    //logger.info(ret);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        ret = await stockdb.addUser(username, '', '');
        if (ret.code == 'ERROR') {
            res.set({ 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({status: 'Failed to create user'}));
            return;
        }
        logger.info('create a new user : ' + username);
        showtutorial = true;
    }
    logger.info('user[' + username + '] login');
    cookies.create(res, username);

    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({status: 'OK', showtutorial: showtutorial}));
});

router.get('/logout', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('logout from ' + ip);
    res.clearCookie('profile');
    redirect(res, "/");
});

router.get('/warehouse', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('warehouse from ' + ip);
    if (await cookies.check(req.cookies) == false) {
        redirect(res, '/');
        return;
    }
    res.render('warehouse', {
        maxMonitoredStocks: 20,
        username: req.cookies.profile.username,
    });
});

module.exports = router;
