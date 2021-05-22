const { Worker } = require('worker_threads');
const path = require('path');
const fetchWorker = new Worker('./controller/TWSEFetchWorker.js');

var logger = require('log4js').getLogger('TWSE');
var TWSEFetch = require('./TWSEFetch.js');

fetchWorker.on('message', (message) => {
    logger.info('fetchWorker message');
    logger.info(message);
});

module.exports.getCurrMonth = function(stockId, async = false) {
    var todayDate = new Date();
    var mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    var yyyy = todayDate.getFullYear();
    var stockDate = yyyy + mm + '01';
    logger.info('getCurrMonth: ' + stockDate + ',' + stockId);
    if (async == true) {
        var stock = TWSEFetch.get(stockDate, stockId);
        return stock;
    }
    else {
        //TWSE_fetch.run('http://....');
        fetchWorker.postMessage({
            date: stockDate, stockId: stockId, history: false
        });
        return undefined;
    }
}

module.exports.getHistory = function(stockId, async = false) {
    if (async == true) {
        var stockArray = TWSEFetch.getHistory(stockId);
        //logger.info(stockArray);
        return stockArray;
    }
    else {
        //TWSE_fetch.run('http://....');
        fetchWorker.postMessage({
            date: undefined, stockId: stockId, history: true
        });
        return TWSEFetch.getHistoryDate();
    }
}

