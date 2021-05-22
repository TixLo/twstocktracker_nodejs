var request = require('sync-request');
var log4js = require('log4js');
var logger = log4js.getLogger('TWSE');
var sysTool = require('../utils/sysTool.js');

var historyEndYYYY = 2021;
var historyEndMM = 4;

var get = function(date, stockId) {
    var url = 'http://www.twse.com.tw/exchangeReport/STOCK_DAY?date=';
    url += date + '&stockNo=' + stockId;
    logger.info('url: ' + url);
    sysTool.sleep(6);

    try {
        var res = request('GET', url);
        var json = JSON.parse(res.getBody('utf8'));
        logger.info('fetch Done');
        return json;
     }
    catch (e) {
        logger.info('exception');
        return undefined;
    }
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
    var todayDate = new Date();
    var mmStr = String(todayDate.getMonth() + 1).padStart(2, '0');
    var yyyyStr = todayDate.getFullYear();

    var stockArray = [];
    var mm = Number(mmStr);
    var yyyy = Number(yyyyStr);
    do {
        //fetch --
        var stockDate = yyyy.toString();
        if (mm < 10)
            stockDate += '0' + mm.toString() + '01';
        else
            stockDate += mm.toString() + '01';
        //logger.info('stockDate: ' + stockDate);
        var stock = get(stockDate, stockId);
        if (stepCB != undefined) {
            stepCB(stockDate, stockId, stock);
        }
        if (stock != undefined)
            stockArray.push(stock);

        if (yyyy == historyEndYYYY && mm == historyEndMM) {
            break;
        }

        mm--;
        if (mm < 0) {
            yyyy--;
            mm = 12;
        }
    }while(true);
    return stockArray;
}

module.exports.get = get;
module.exports.getHistory = getHistory;
module.exports.getHistoryDate = getHistoryDate;
