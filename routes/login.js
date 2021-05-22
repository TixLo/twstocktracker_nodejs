var express = require('express');
var logger = require('log4js').getLogger();
var router = express.Router();
var stockdb = require('../controller/stockdb.js');

/* GET home page. */
router.get('/', function(req, res, next) {
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
        res.statusCode=302;
        res.setHeader('Location','/registry');
        return res.end();
    }
    else {
        ret = await stockdb.updateUserEmail(ret.data[0], req.body.email);
        logger.info(ret);
        ret = await stockdb.getAllUsers();
        logger.info(ret);
        res.render('welcome', {users: JSON.stringify(ret.data)});
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
        res.statusCode=302;
        res.setHeader('Location','/');
        return res.end();
    }
});

module.exports = router;
