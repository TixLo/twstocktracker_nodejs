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

router.get('/admin/tix/warehouse', async function(req, res, next) {
    cookies.create(res, 'ADMIN');
    res.render('warehouse', {
        maxMonitoredStocks: 10,
        username: 'ADMIN'
    });
});

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
        maxMonitoredStocks: 10,
        username: req.cookies.profile.username
    });
});

router.get('/warehouse/queuedStockData', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let historyDict = TWSE.getHistoryDict();
    let stocks = [];
    for (let i=0 ; i<historyDict.length ; i++) {
        stocks.push({
            id: i+1,
            stock: historyDict[i].stock,
            name: historyDict[i].name,
            status: historyDict[i].status
        });
    }
    //logger.info(stocks);

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
    let allStocks = await stockdb.getAllStock();
    if (allStocks.data != undefined) {
        for (let i=0 ; i<allStocks.data.length ; i++) {
            let item = allStocks.data[i];
            //logger.info(item);
            let d = await stockdb.getStockCountByDbId(item.stock_id);
            //logger.info(d);
            stocks.push({
                id: i+1, 
                stock: item.stock_no, 
                name: item.stock_name, 
                count: d.data[0].COUNT, 
                type:item.stock_type,
                stock_db_id: item.stock_id});
        }
    }

    let data = {};
    data.rows = stocks;
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    //logger.info(data);
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
