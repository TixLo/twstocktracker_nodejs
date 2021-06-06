var express = require('express');
var fs = require("fs");
var logger = require('log4js').getLogger('stock');
var router = express.Router();
var stockdb = require('../controller/stockdb');
var TWSE = require('../controller/TWSE');
var cookies = require('./cookies');
var format = require('string-format');

format.extend(String.prototype, {})

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

router.get('/monitor', async function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    logger.info('monitor from ' + ip);
    if (await cookies.check(req.cookies) == false) {
        redirect(res, '/');
        return;
    }
    res.render('monitor', {
        username: req.cookies.profile.username
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
            logger.info(item);
            let d = await stockdb.getStockCountByDbId(item.stock_id);
            logger.info(d);
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

router.get('/monitorStocks', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let user = await stockdb.getUserByName(req.cookies.profile.username);
    if (user.data == undefined) {
        res.render('loginFailure', {msg: '資料出錯, 請重新燈入'});
        return;
    }

    let allStocks = await stockdb.getUserStocks(user.data[0]);
    let stocks = [];
    for (let i=0 ; i<allStocks.length ; i++) {
        stocks.push({
            id: i + 1,
            stock: allStocks[i].stock_no,
            name: allStocks[i].stock_name,
            dataCount: allStocks[i].data.length,
            dealCount: 0,
            win: '2.2%',
            profit: '10%',
            status: '-'
        });
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

router.get('/warehouse/allUsers', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    let allUsers = await stockdb.getAllUsers();
    if (allUsers.data == undefined) {
        res.render('loginFailure', {msg: '資料出錯, 請重新燈入'});
        return;
    }

    let users = [];
    for (let i=0 ; i<allUsers.data.length ; i++) {
        let stocks = await stockdb.getUserStocks(allUsers.data[i]);
        //logger.info(stocks);
        let listData = '';
        let count= 0;
        for (let j=0 ; j<stocks.length ; j++) {
            listData += stocks[j].stock_name + '[' + stocks[j].stock_no + ']';
            if (j != stocks.length - 1)
                listData += ',';
            count++;
        }

        users.push({
            id: i + 1,
            username: allUsers.data[i].tracker_user,
            email: allUsers.data[i].tracker_email,
            count: count,
            list: listData
        });
    }

    let data = {};
    data.rows = users;
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    //logger.info(data);
    res.end(JSON.stringify(data));
});

router.post('/genstock', async function(req, res, next) {
    if (await cookies.check(req.cookies) == false) {
        res.end('');
        return;
    }

    var response = function(res, status, dataUrl) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: status,
            dataUrl: dataUrl
        }));
    }

    let dataUrl = '';
    logger.info(req.body);
    if (req.body.stock == undefined) {
        response(res, 'Error', '');
        return;
    }

    let converDateFormat = function(d) {
        if (d == undefined)
            return undefined;
        let tokens = d.split('/');
        if (tokens.length != 3)
            return undefined;

        let yyyy = parseInt(tokens[2]) - 1911;
        let mm = tokens[0];
        let dd = tokens[1];
        return ('{0}/{1}/{2}').format(yyyy, mm, dd);
    }

    //
    // read stock data from DB
    //
    let s = await stockdb.getStock([req.body.stock]);
    if (s.data == undefined) {
        response(res, 'Error', '');
        return;
    }
    
    let d = await stockdb.getStockDayByPeriod(
                req.body.stock,
                converDateFormat(req.body.startTime),
                converDateFormat(req.body.endTime));
    if (d.data == undefined) {
        response(res, 'Error', '');
        return;
    }
    let stock = d.data;

    //
    //sort by date_stock
    //
    stock.sort(function(a, b){
        return (a.date_stock - b.date_stock);
    });
    //logger.info(stock);

    //
    // generate json
    //
    let stockJson = {};
    stockJson.StockId = req.body.stock;
    stockJson.Name = s.data[0].stock_name;
    stockJson.Type = s.data[0].stock_type;
    stockJson.Title = [
        "日期",        //0
        "開盤價",      //1
        "最高價",      //2
        "最低價",      //3
        "收盤價",      //4
        "漲跌",        //5
        "成交量",      //6
        "5MA",         //7
        "10MA",        //8
        "20MA",        //9
        "60MA",        //10
    ];
    let stockDataJson = [];
    for (let i=0 ; i<stock.length ; i++) {
        let d = [];

        let time = new Date(stock[i].date_stock);
        let yyyy = time.getFullYear();
        let mm = time.getMonth();
        let dd = time.getDate();
        d.push(yyyy + '/' + mm + '/' + dd);
        d.push(stock[i].stock_open_price);
        d.push(stock[i].stock_highest_price);
        d.push(stock[i].stock_lowest_price);
        d.push(stock[i].stock_close_price);
        d.push(stock[i].stock_delta_price);
        d.push(stock[i].stock_deal_num);
        d.push(0);
        d.push(0);
        d.push(0);
        d.push(0);

        //logger.info(stock[i]);
        //logger.info(d);
        stockDataJson.push(d);
    }
    stockJson.Data = stockDataJson;

    //
    // write to file
    //
    let filename = '{0}_{1}.json'.format(req.cookies.profile.username, req.body.stock);
    //logger.info(filename);
    let base64Filename = Buffer.from(filename).toString('base64');
    //logger.info(base64Filename);
    try {
        let buf = JSON.stringify(stockJson, null, 2);
        fs.writeFileSync('./public/stock/' + base64Filename, buf,{flag:'w+'});
        //console.log("File written successfully");
        status = 'OK';
        dataUrl = '/stock/' + base64Filename; 
        response(res, 'OK', '/stock/' + base64Filename);
    } catch(err) {
        console.error(err);
        response(res, 'Error', '');
    }
});

module.exports = router;
