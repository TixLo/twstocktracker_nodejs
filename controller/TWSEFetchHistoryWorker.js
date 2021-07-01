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
var getType2History = async function(stockId) {
    let allDates = TWSEFetch.getHistoryDate();
    for (let curr=0 ; curr<allDates.length ; curr++) {
        logger.info('[' + curr + ']: ' + allDates[curr]);
    }
};

var getType1History = async function(stockId) {
    logger.info('getType1History: ' + stockId);
    let stockArray = [];
    let allDates = TWSEFetch.getHistoryDate();
    let tmp = {
        ma5: [],
        ma10: [],
        ma20: [],
        ma40: [],
        ma60: [],
        pool: [],
        prevK9: 0,
        prevD9: 0,
    };

    for (let curr=allDates.length - 1 ; curr>=0 ; curr--) {
        let date = allDates[curr];
        logger.info('[' + curr + ']: ' + date);
        let stock = TWSEFetch.get(date, stockId);
        if (stock == undefined) {
            logger.info('Failed!!!');
            continue;
        }
        await stockdb.addStock(stock, 'TYPE1', tmp);
        firstFetch = false;

        // update to main thread
        parentPort.postMessage({
            finish: false,
            curr: (allDates.length - curr),
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



