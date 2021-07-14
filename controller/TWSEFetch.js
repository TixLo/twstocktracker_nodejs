var request = require('sync-request');
var log4js = require('log4js');
var logger = log4js.getLogger('TWSE');
var sysTool = require('../utils/sysTool.js');
var stockdb = require('../controller/stockdb');
var format = require('string-format');
var stocksTable = require('../controller/StocksTable.js');

format.extend(String.prototype, {})

var todayRTStocks = {};
var historyEndYYYY = 2010;
var historyEndMM = 1;
var todayRTStartTime = 0;

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

var get = async function(date, stockId) {
    stocksTable.init();
    var otc2Tbl = stocksTable.getOTC2();
    var type = 'TYPE1';
    if (otc2Tbl[stockId])
        type = 'TYPE2';

    logger.info('type: ' + type);

    var url = '';
    if (type == 'TYPE1') {
        url = 'http://www.twse.com.tw/exchangeReport/STOCK_DAY?date=';
        url += date + '&stockNo=' + stockId;
    }
    else {
        let d1 = date.substring(0,4);
        let d2 = parseInt(d1) - 1911;
        url = 'http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?d=';
        url += d2 + '/' + date.substring(4,6) + '&stkno=' + stockId;
    }
    logger.info('url: ' + url);
    //sysTool.sleep(6);
    await sleep(6000);
    try {
        //var res = request('GET', url);
        var res = request('GET', url ,{
            timeout: 20000
        });
        var json = JSON.parse(res.getBody('utf8'));
        logger.info('fetch Done');
        if (type == 'TYPE1') {
            if (json != undefined && json.stat != 'OK') {
                logger.info(json);
                return undefined;
            }

            if (json.title == undefined) {
                logger.info('json.title == undefined');
                logger.info(json);
                return undefined;
            }
            json.name = json.title.split(' ')[2];
            json.stockId = stockId;
            //'日期', '成交股數', '成交金額', '開盤價', '最高價', '最低價', '收盤價', '漲跌價差', '成交筆數'
        }
        else {
            //logger.info(json);
            //logger.info('----');
            if (json == undefined || json.aaData.length == 0) {
                logger.info(json);
                return undefined;
            }

            json.name = json.stkName;
            json.stockId = stockId;
            json.data = json.aaData;
            delete json.aaData;
            //logger.info(json);
        }
        json.type = type;
        return json;
     }
    catch (e) {
        logger.info('exception');
        return undefined;
    }
}

var getCurrMonth = async function(stockId) {
    var todayDate = new Date();
    var mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    var yyyy = todayDate.getFullYear();
    var stockDate = yyyy + mm + '01';
    var stock = await get(stockDate, stockId);
    return stock;
}

var getHistoryDate = function() {
    var todayDate = new Date();
    var mmStr = String(todayDate.getMonth() + 1).padStart(2, '0');
    var yyyyStr = todayDate.getFullYear();

    var allDate = [];
    var mm = Number(mmStr);
    var yyyy = Number(yyyyStr);
    do {
        var stockDate = yyyy.toString();
        if (mm < 10)
            stockDate += '0' + mm.toString() + '01';
        else
            stockDate += mm.toString() + '01';
        allDate.push(stockDate);
        
        if (yyyy == historyEndYYYY && mm == historyEndMM) {
            break;
        }

        mm--;
        if (mm < 0) {
            yyyy--;
            mm = 12;
        }
    }while(true);
    return allDate;
}

var getHistory = function(stockId, stepCB = undefined) {
    let allDates = getHistoryDate();
    let stockArray = [];
    for (let curr=0 ; curr<allDates.length ; curr++) {
        let stockDate = allDates[curr];
        var stock = get(stockDate, stockId);
        if (stepCB != undefined) {
            stepCB(stock, curr + 1, allDates.length);
        }
        if (stock != undefined)
            stockArray.push(stock);
    }

    return stockArray;
}

var triggerFetch = function() {
    let curr = new Date().getTime();
    let endDelta = 4.5 * 60 * 60 * 1000;
    logger.info('curr: ' + curr + ', todayRTStartTime: ' + todayRTStartTime);
    logger.info('diff: ' + (curr - todayRTStartTime) + ', endDelta: ' + endDelta);
    if ((curr - todayRTStartTime) < endDelta) {
        logger.info('continue to fetch realtime price');
        setTimeout(function(){
            fetchRealTimeStockPrice();
        }, 10000);
    }
    else {
        logger.info('stop to fetch realtime price');
    }
}

var fetchRealTimeStockPrice = async function() {
    let allStocks = await stockdb.getAllStock();
    if (allStocks.data == undefined) {
        return;
    }

    let key = '';
    for (let i=0 ; i<allStocks.data.length ; i++) {
        let item = allStocks.data[i];
        //logger.info(item);
        if (item.stock_type == '上市') {
            key += 'tse_' + item.stock_no+ '.tw';
        }
        else if (item.stock_type == '上櫃') {
            key += 'otc_' + item.stock_no+ '.tw';
        }

        if (i < allStocks.data.length - 1)
            key += '|';
    }

    let url = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch={0}&json=1&delay=0';
    url = url.format(key);
    logger.info('url: ' + url);

    let result = true;
    let msgArray = [];
    let sysDate = '';
    try {
        var res = request('GET', url ,{
            timeout: 20000
        });
        var json = JSON.parse(res.getBody('utf8'));
        //logger.info('fetch Done');
        //logger.info(json);
        if (json == undefined || json.msgArray == undefined) {
            result = false;
        }
        else {
            msgArray = json.msgArray;
            sysDate = json.queryTime.sysDate;
        }
     }
    catch (e) {
        result = false;
    }

    if (result == false) {
        logger.info('fetch failed');
        triggerFetch();
        return;
    }

    let ID = "c";
    let PRICE = "z";
    for (let i=0 ; i<msgArray.length ; i++) {
        let p = 0;
        if (msgArray[i][PRICE] != '-') {
            p = parseFloat(msgArray[i][PRICE]);
            todayRTStocks[msgArray[i][ID]] = {
                date: sysDate.substring(0,4) 
                        + '/' + sysDate.substring(4,6)
                        + '/' + sysDate.substring(6,8),
                price: p
            }
        }
    }

    //logger.info(todayRTStocks);
    triggerFetch();
}

var getTodayRTStocks = function() {
    return todayRTStocks;
}

var resetTodayRTStocks = function() {
    todayRTStocks = {};
}

var markTodayRTStartTime = function() {
    todayRTStartTime = new Date().getTime();
    logger.info('markTodayRTStartTime:' + todayRTStartTime);
}

module.exports.get = get;
module.exports.getHistory = getHistory;
module.exports.getHistoryDate = getHistoryDate;
module.exports.getCurrMonth = getCurrMonth;
module.exports.fetchRealTimeStockPrice = fetchRealTimeStockPrice;
module.exports.getTodayRTStocks = getTodayRTStocks;
module.exports.resetTodayRTStocks = resetTodayRTStocks;
module.exports.markTodayRTStartTime = markTodayRTStartTime;
