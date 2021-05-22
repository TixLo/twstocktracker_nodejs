const { parentPort } = require('worker_threads');
var TWSEFetch = require('./TWSEFetch.js');

var log4js = require('log4js');
let logConfig = require('../config/log4js.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('TWSEWorker');

var get = function(date, stockId) {
    logger.info('get: ' + date + ',' + stockId);
    var stock = TWSEFetch.get(date, stockId);
    parentPort.postMessage({
        history: false,
        date: date,
        stockId: stockId,
        data: stock
    });
}

var getHistory = function(stockId) {
    logger.info('getHistory: ' + stockId);
    var stockArray = TWSEFetch.getHistory(stockId, function(date, stockId, stock){
        parentPort.postMessage({
            history: true,
            date: date,
            stockId: stockId,
            data: stock
        });
    });
    parentPort.postMessage(stockArray);
}

parentPort.on('message', (message) => {
    logger.info(message);
    if (message.history == false) {
        get(message.date, message.stockId);
    }
    else {
        getHistory(message.stockId);
    }
});



