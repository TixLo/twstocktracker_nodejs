const { parentPort } = require('worker_threads');
var TWSEFetch = require('./TWSEFetch.js');
var stockdb = require('./stockdb.js');
var log4js = require('log4js');
let logConfig = require('../config/log4js.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('TWSEHistoyWorker');

var queueStock = [];
var waitingUpdate = false;
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
    for (let curr=allDates.length - 1 ; curr>=0 ; curr--) {
        let date = allDates[curr];
        logger.info('[' + curr + ']: ' + date);
        let stock = TWSEFetch.get(date, stockId);
        if (stock == undefined) {
            logger.info('Failed!!!');
            continue;
        }
        logger.info('waiting addStock...');
        await stockdb.addStock(stock, 'TYPE1');
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

    logger.info('waitting calcStock...');
    await stockdb.calcStock(stockId);

    logger.info('post message..');
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
    logger.info('queueStock.length: ' + queueStock.length + ',waitingUpdate: ' + waitingUpdate);
    if (waitingUpdate) {
        logger.info('call updateCurrMonth()');
        updateCurrMonth();
    }
    else if (queueStock.length > 0) {
        logger.info('call getType1History()');
        getType1History(queueStock[0].stock);
    }
    else {
        logger.info('done!!!');
        fetching = false;
    }
}

var updateCurrMonth = async function() {
    let data = await stockdb.getAllStock();
    if (data.code == 'OK') {
        for (let i=0 ; i<data.data.length ; i++) {
            let item = data.data[i];
            logger.info('update this month for ' + item.stock_no);
            let stock = TWSEFetch.getCurrMonth(item.stock_no);
            if (stock == undefined) {
                logger.info('Failed!!!');
                continue;
            }
            //logger.info(stock);
            await stockdb.addStock(stock, 'TYPE1');
            await stockdb.calcStock(item.stock_no);
        }
    }

    logger.info('queueStock.length: ' + queueStock.length);
    waitingUpdate = false;
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

    if (message.type != 'update') {
        queueStock.push({stock: message.stock, type: message.type});
        logger.info(queueStock);
    }

    if (fetching == false) {
        if (message.type == 'TYPE1') {
            getType1History(message.stock);
        }
        else {
            updateCurrMonth();
        }
        fetching = true;
    }
    else {
        if (message.type == 'update') {
            waitingUpdate = true;
        }
    }
});
