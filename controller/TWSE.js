const { Worker } = require('worker_threads');
const path = require('path');
const fetchWorker = new Worker('./controller/TWSEFetchWorker.js');
const fetchHistoryWorker = new Worker('./controller/TWSEFetchHistoryWorker.js');
var conn = require('../routes/conn');

var logger = require('log4js').getLogger('TWSE');
var TWSEFetch = require('./TWSEFetch.js');

var historyDict = [
];

var processTestFetch = function(message) {
    logger.info('processTestFetch');
    logger.info(historyDict);
    for (let i=0 ; i<historyDict.length ; i++) {
        if (message.stock == historyDict[i].stock) {
            if (message.legal == true) {
                historyDict[i].testing = false;
                conn.addStockResult(historyDict[i].socket, 'OK');
            }
            else {
                conn.addStockResult(historyDict[i].socket, 'Not Supported');
                historyDict.splice(i, 1);
            }
            break;
        }
    }
}

var processHistoryFetch = function(message) {
    for (let i=0 ; i<historyDict.length ; i++) {
        if (message.stock == historyDict[i].stock) {
            if (message.finish == true) {
                historyDict.splice(i, 1);
            }
            else
                historyDict[i].status = message.curr + '/' + message.total;
        }
    }
    conn.broadcast('updateQueuedTable', {
        completed: message.curr, total: message.total, stock: message.stock
    });
}

fetchWorker.on('message', (message) => {
    logger.info('fetchWorker message');
//    logger.info(message);
});

fetchHistoryWorker.on('message', (message) => {
    logger.info('fetchHistoryWorker message');
    logger.info(message);
    if (message.testFetch != undefined) {
        processTestFetch(message);
    }
    else {
        processHistoryFetch(message);
    }


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

module.exports.pushFetchStock = function(socket, stock, type) {
    let duplicated = false;
    historyDict.forEach(function(item){
        if (item.stock == stock) {
            duplicated = true;
            logger.info('duplicated stock');
        }
    });

    if (duplicated)
        return false;

    //logger.info(historyDict);
    historyDict.push({socket: socket, stock: stock, type: type, status:' - ', testing: true});
    fetchHistoryWorker.postMessage({
        fetchTest: true, stock: stock, type: type
    });
    return true;
}

module.exports.getHistoryDict = function() {
    return historyDict;
}
