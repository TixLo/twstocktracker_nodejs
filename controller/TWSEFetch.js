var request = require('sync-request');
var log4js = require('log4js');
var logger = log4js.getLogger('TWSE');
var sysTool = require('../utils/sysTool.js');
var stockdb = require('../controller/stockdb');
var format = require('string-format');

format.extend(String.prototype, {})

var todayRTStocks = {};
var historyEndYYYY = 2021;
var historyEndMM = 5;

var get = function(date, stockId) {
    var url = 'http://www.twse.com.tw/exchangeReport/STOCK_DAY?date=';
    url += date + '&stockNo=' + stockId;
    logger.info('url: ' + url);
    sysTool.sleep(6);

    try {
        var res = request('GET', url);
        var json = JSON.parse(res.getBody('utf8'));
        logger.info('fetch Done');
        if (json != undefined && json.stat != 'OK') {
            logger.info(json);
            return undefined;
        }

        if (json.title == undefined)
            return undefined;

        json.name = json.title.split(' ')[2];
        json.stockId = stockId;
        return json;
     }
    catch (e) {
        logger.info('exception');
        return undefined;
    }
}

var getCurrMonth = function(stockId) {
    var todayDate = new Date();
    var mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    var yyyy = todayDate.getFullYear();
    var stockDate = yyyy + mm + '01';
    var stock = get(stockDate, stockId);
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

        if (i < allStocks.data.length - 1)
            key += '|';
    }

    let url = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch={0}&json=1&delay=0';
    url = url.format(key);
    logger.info('url: ' + url);

    let msgArray = [];
    let sysDate = '';
    try {
        var res = request('GET', url);
        var json = JSON.parse(res.getBody('utf8'));
        //logger.info('fetch Done');
        //logger.info(json);
        if (json == undefined || json.msgArray == undefined) {
            return;
        }
        msgArray = json.msgArray;
        sysDate = json.queryTime.sysDate;
     }
    catch (e) {
        return;
    }

    let ID = "c";
    let PRICE = "z";
    for (let i=0 ; i<msgArray.length ; i++) {
        todayRTStocks[msgArray[i][ID]] = {
            date: sysDate.substring(0,4) 
                    + '/' + sysDate.substring(4,6)
                    + '/' + sysDate.substring(6,8),
            price: parseFloat(msgArray[i][PRICE])
        }
    }
}

var getTodayRTStocks = function() {
    return todayRTStocks;
}

module.exports.get = get;
module.exports.getHistory = getHistory;
module.exports.getHistoryDate = getHistoryDate;
module.exports.getCurrMonth = getCurrMonth;
module.exports.fetchRealTimeStockPrice = fetchRealTimeStockPrice;
module.exports.getTodayRTStocks = getTodayRTStocks;
