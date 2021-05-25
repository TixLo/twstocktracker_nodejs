var express = require('express');
var logger = require('log4js').getLogger('stock');
var router = express.Router();
var stockdb = require('../controller/stockdb');
var TWSE = require('../controller/TWSE');
var cookies = require('./cookies');

var redirect = function(res, url) {
    res.statusCode=302;
    res.setHeader('Location',url);
    return res.end();
}

router.get('/warehouse', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('warehouse from ' + ip);
    if (await cookies.check(req.cookies) == false) {
        redirect(res, '/login');
        return;
    }
    res.render('warehouse', {
        maxMonitoredStocks: 10
    });
});

router.get('/warehouse/queuedStockData', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let historyDict = TWSE.getHistoryDict();
logger.info(historyDict);
    let stocks = [];
    for (let i=0 ; i<historyDict.length ; i++) {
        if (historyDict[i].testing == true)
            continue;
        stocks.push({
            id: i+1,
            stock: historyDict[i].stock,
            name: '--',
            status: historyDict[i].status
        });
    }

    //stocks.push({id: 1, stock: '2454', name: 'ABC',status: '100'});
    //stocks.push({id: 2, stock: '2453', name: 'DDD',status: '100'});
    //stocks.push({id: 3, stock: '2452', name: 'AAA',status: '100'});
    //stocks.push({id: 4, stock: '2451', name: 'CCC',status: '100'});
    //stocks.push({id: 5, stock: '2450', name: 'CBA',status: '100'});
    let data = {};
    data.rows = stocks;
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
});

router.get('/warehouse/stocks', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let stocks = [];
    stocks.push({id: 1, stock: '2454', name: 'ABC', count: 1234, type:'上市'});
    stocks.push({id: 2, stock: '2453', name: 'ABC', count: 1234, type:'上市'});
    stocks.push({id: 3, stock: '2452', name: 'ABC', count: 1234, type:'上市'});
    stocks.push({id: 4, stock: '2451', name: 'ABC', count: 1234, type:'上市'});
    let data = {};
    data.rows = stocks;
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
});

router.post('/warehouse/add', async function(req, res, next) {
    logger.info(req.body);
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let data = {};
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
});

module.exports = router;
