const { parentPort } = require('worker_threads');
var TWSEFetch = require('./TWSEFetch.js');
var stockdb = require('./stockdb.js');
var log4js = require('log4js');
let logConfig = require('../config/log4js.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('TWSEHistoyWorker');

var queueStock = [];
var fetching = false;

// TYPE1: 上市
var getType1History = async function(stockId) {
    logger.info('getType1History: ' + stockId);
    let stockArray = [];
    let allDates = TWSEFetch.getHistoryDate();
    for (let curr=0 ; curr<allDates.length ; curr++) {
        let date = allDates[curr];
        let stock = TWSEFetch.get(date, stockId);
        if (stock == undefined) {
            continue;
        }
        await stockdb.addStock(stock, 'TYPE1');

        // update to main thread
        parentPort.postMessage({
            finish: false,
            curr: curr + 1,
            total: allDates.length,
            date: stock.date,
            stock: stock.stockId,
            name: stock.name,
            data: stock
        });
        stockArray.push(stock);
    }

    parentPort.postMessage({
        finish: true,
        stock: stockId,
        data: stockArray
    });

    //
    // remove from queue
    //
    for (let i=0 ; i<queueStock.length ; i++) {
        if (queueStock[i].stock == stockId) {
            queueStock.splice(i, 1);
            break;
        } 
    }

    //
    // check queue
    //
    if (queueStock.length > 0) {
         getType1History(queueStock[0].stock);
    }
    else {
        fetching = false;
    }
}

parentPort.on('message', (message) => {
    logger.info(message);
    if (message == undefined)
        return;

    if (message.stock == undefined || message.type == undefined) {
        return;
    }

    queueStock.push({stock: message.stock, type: message.type});
    logger.info(queueStock);

    if (fetching == false) {
         if (message.type == 'TYPE1') {
             getType1History(message.stock);
         }
        fetching = true;
    }
});



