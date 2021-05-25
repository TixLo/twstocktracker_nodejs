const { parentPort } = require('worker_threads');
var TWSEFetch = require('./TWSEFetch.js');

var log4js = require('log4js');
let logConfig = require('../config/log4js.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('TWSEHistoyWorker');

var queueStock = [];
var fetching = false;

var getHistory = function(stockId) {
    logger.info('getHistory: ' + stockId);
    var stockArray = TWSEFetch.getHistory(stockId, function(date, stock, stock, curr, total){
        parentPort.postMessage({
            finish: false,
            curr: curr,
            total: total,
            date: date,
            stock: stockId,
            data: stock
        });
    });
    parentPort.postMessage({
        finish: true,
        stock: stockId,
        data: stockArray
    });

    for (let i=0 ; i<queueStock.length ; i++) {
        if (queueStock[i].stock == stockId) {
            queueStock.splice(i, 1);
            break;
        } 
    }
}

parentPort.on('message', (message) => {
    logger.info(message);
    if (message == undefined)
        return;

    if (message.stock == undefined || message.type == undefined) {
        return;
    }

    if (message.fetchTest == true) {
        let stock = TWSEFetch.getCurrMonth(message.stock);
        let legal = false;
        if (stock != undefined)
            legal = true;
        parentPort.postMessage({
            testFetch: true,
            legal: legal,
            stock: message.stock
        });

        if (legal == true) {
            queueStock.push({stock: message.stock, type: message.type});
            logger.info(queueStock);

            if (fetching == false) {
                getHistory(message.stock);
            }
        }
    }
});



