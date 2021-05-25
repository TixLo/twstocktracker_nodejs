var express = require('express');
var logger = require('log4js').getLogger();
var router = express.Router();
var stockdb = require('../controller/stockdb.js');
var cookies = require('./cookies.js');

var redirect = function(res, url) {
    res.statusCode=302;
    res.setHeader('Location',url);
    return res.end();
}

var homePage = '/stock/warehouse';

router.get('/', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    //res.clearCookie('profile');
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
    res.render('login');
});

router.get('/registry', function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('registry from ' + ip);
    res.render('registry');
});

router.get('/monitor', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('monitor from ' + ip);
    if (await cookies.check(req.cookies) == false) {
        redirect(res, '/');
        return;
    }
    res.render('monitor');
});

router.post('/tracker', async function(req, res) {
    logger.info('tracker');
    logger.info(req.body);
    if (req.body.username == undefined || 
        req.body.password == undefined) {
        res.render('loginFailure');
        return;
    }

    if (req.body.username.length == 0 ||
        req.body.password.length == 0) {
        res.render('loginFailure');
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
        res.render('loginFailure');
        return;
    }

    if (req.body.username.length == 0 ||
        req.body.password.length == 0 ||
        req.body.email.length == 0) {
        res.render('loginFailure');
        return;
    }

    var ret = await stockdb.addUser(req.body.username, req.body.password, req.body.email);
    if (ret.code == 'ERROR') {
        res.render('registryFailure');
        return;
    }
    else {
        redirect(res, '/');
    }
});

module.exports = router;
