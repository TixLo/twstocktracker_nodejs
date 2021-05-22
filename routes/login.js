var express = require('express');
var logger = require('log4js').getLogger();
var router = express.Router();
var stockdb = require('../controller/stockdb.js');

var redirect = function(res, url) {
    res.statusCode=302;
    res.setHeader('Location',url);
    return res.end();
}
var checkCookies = async function(cookies) {
    logger.info(cookies);
    if (cookies == undefined)
        return false;

logger.info('1');
    if (cookies.profile == undefined)
        return false;

logger.info('2');
    let username = cookies.profile.username;
    let email = cookies.profile.email;
    if (username == undefined || email == undefined)
        return false;

logger.info('3');
    var ret = await stockdb.getUserByName(username);
    logger.info(ret);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        return false;
    }
logger.info('4');
    return true;
}

router.get('/', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('login from ' + ip);
    if (await checkCookies(req.cookies) == true) {
        redirect(res, '/monitor');
        return;
    }
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
    if (await checkCookies(req.cookies) == false) {
        redirect(res, '/');
        return;
    }
    res.render('monitor');
});

router.post('/tracker', async function(req, res) {
    logger.info('tracker');
    logger.info(req.body);
    if (req.body.username == undefined || req.body.email == undefined) {
        res.render('loginFailure');
        return;
    }

    if (req.body.username.length == 0 || req.body.email.length == 0) {
        res.render('loginFailure');
        return;
    }

    var ret = await stockdb.getUserByName(req.body.username);
    logger.info(ret);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        redirect(res, '/registry');
        return res.end();
    }
    else {
        ret = await stockdb.updateUserEmail(ret.data[0], req.body.email);
        logger.info(ret);

        let cookieOptions = {
            httpOnly: true,
            maxAge: 5 * 60 * 60 * 1000, // 5 hours
        }

        res.cookie('profile', {
            username: req.body.username,
            email: req.body.email
        }, cookieOptions);

        redirect(res, '/monitor');
    }
});

router.post('/doregistry', async function(req, res) {
    logger.info('registry');
    logger.info(req.body);
    if (req.body.username == undefined || req.body.email == undefined) {
        res.render('loginFailure');
        return;
    }

    if (req.body.username.length == 0 || req.body.email.length == 0) {
        res.render('loginFailure');
        return;
    }

    var ret = await stockdb.addUser(req.body.username, req.body.email);
    logger.info(ret);
    if (ret.code == 'ERROR') {
        res.render('registryFailure');
        return;
    }
    else {
        redirect(res, '/');
    }
});

module.exports = router;
