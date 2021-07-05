const { Worker } = require('worker_threads');
const path = require('path');
const fetchWorker = new Worker('./controller/TWSEFetchWorker.js');
const fetchHistoryWorker = new Worker('./controller/TWSEFetchHistoryWorker.js');
var stockdb = require('./stockdb.js');
var stocksTable = require('../controller/StocksTable.js');
var conn = require('../routes/conn');

var logger = require('log4js').getLogger('TWSE');
var TWSEFetch = require('./TWSEFetch.js');

var historyDict = [
];

var processHistoryFetch = function(message) {
    let currStock = '';
    let currStockName = '';
    let currCompleted = 0;
    let currTotal = 0;
    for (let i=0 ; i<historyDict.length ; i++) {
        if (message.stock == historyDict[i].stock) {
            currStock = message.stock;
            currStockName = message.name;
            currCompleted = message.curr;
            currTotal = message.total;
            if (message.finish == true) {
                historyDict.splice(i, 1);
                conn.broadcast('updateSavedTable', {});
            }
            else {
                //historyDict[i].status = message.curr + '/' + message.total;
                let percentage = (message.curr * 100) / message.total;
                historyDict[i].status = '抓取進度 ' + percentage.toFixed() 
                        + '% (' + message.curr + '/' + message.total + ')';
            }
        }
    }
    conn.broadcast('updateQueuedTable', {
        completed: currCompleted,
        total: currTotal,
        stock: currStock,
        name: currStockName
    });
}

fetchWorker.on('message', (message) => {
    logger.info('fetchWorker message');
    logger.info(message);
});

fetchHistoryWorker.on('message', (message) => {
    logger.info('fetchHistoryWorker message');
    //logger.info(message);
    processHistoryFetch(message);
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

module.exports.pushFetchStock = async function(socket, stock, type) {
    let duplicated = false;

    for (let i=0 ; i<historyDict.length ; i++) {
        let item = historyDict[i];
        if (item.stock == stock) {
            duplicated = true;
            logger.info('duplicated stock');
        }
    }

    if (duplicated) {
        conn.addStockResult(socket, 'duplicated');
        return false;
    }

    let savedStock = await stockdb.querySavedStock(stock);
    if (savedStock.data != undefined) {
        conn.addStockResult(socket, 'existed');
        return false;
    }

    stocksTable.init();
    var tbl = stocksTable.get();
    if (tbl[stock] != undefined) {
        conn.addStockResult(socket, 'OK');
    }
    else {
        conn.addStockResult(socket, 'illegal stock id');
        return false;
    }
    //logger.info(historyDict);
    historyDict.push({
        socket: socket, 
        stock: stock, 
        name: tbl[stock],
        type: type, 
        status:'等待中...'
    });
    fetchHistoryWorker.postMessage({
        stock: stock, type: type
    });
    return true;
}

module.exports.pushFetchStockWithoutChecking = async function(socket, stock, type) {
    stocksTable.init();
    var tbl = stocksTable.get();
    if (tbl[stock] == undefined) {
        return;
    }
    //logger.info(historyDict);
    historyDict.push({
        socket: socket, 
        stock: stock, 
        name: tbl[stock],
        type: type, 
        status:'等待中...'
    });
    fetchHistoryWorker.postMessage({
        stock: stock, type: type
    });
    return;
}

module.exports.getHistoryDict = function() {
    return historyDict;
}

module.exports.updateCurrMonth = function() {
    fetchHistoryWorker.postMessage({
        stock: '', type: 'update'
    });
}
