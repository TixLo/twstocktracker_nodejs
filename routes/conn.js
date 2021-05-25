var logger = require('log4js').getLogger('conn');
var TWSE = require('../controller/TWSE');

var io = undefined;

var init = function(data) {
    io = data;
}

var broadcast = function(cmd, data) {
    if (io == undefined) {
        return;
    }
    logger.info('broadcast: ' + cmd);
    logger.info(data);
    io.sockets.emit(cmd, JSON.stringify(data));
}

var addStockResult = function(socket, status) {
    logger.info('add...result');
    if (socket == undefined || io == undefined) {
        return;
    }
    logger.info('emit');
    socket.emit('addStockResult', JSON.stringify({status: status}));
} 

var addStock = function(socket, data) {
    if (io == undefined) {
        return;
    }
    logger.info('addStock');
    logger.info(data);
    if (TWSE.pushFetchStock(socket, data.stock, data.type) == false) {
        addStockResult(socket, 'duplicated');
    }
}

var connect = function(socket) {
    logger.info('connect');
}

var disconnect = function(socket) {
    logger.info('disconnect');
}

module.exports.init = init;
module.exports.broadcast = broadcast;
module.exports.addStock = addStock;
module.exports.connect = connect;
module.exports.disconnect = disconnect;
module.exports.addStockResult = addStockResult;
