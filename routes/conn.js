var logger = require('log4js').getLogger('conn');
var TWSE = require('../controller/TWSE');

var io = undefined;

var map = {};

var init = function(data) {
    io = data;
}

var broadcast = function(cmd, data) {
    if (io == undefined) {
        return;
    }
    logger.info('broadcast: ' + cmd);
    logger.info(data);
    io.sockets.emit(cmd, data);
}

var onlineNotify = function() {
    broadcast('online', {count: Object.keys(map).length});
}

var addStockResult = function(socket, status) {
    if (socket == undefined || io == undefined) {
        return;
    }
    socket.emit('addStockResult', {status: status});
} 

var addStock = function(socket, data) {
    if (io == undefined) {
        return;
    }
    logger.info(data);
    if (TWSE.pushFetchStock(socket, data.stock, data.type) == false) {
        addStockResult(socket, 'duplicated');
    }
}

var connect = function(socket) {
    logger.info('connect');
}

var disconnect = function(socket) {
    logger.info('disconnect: ' + socket.username + ', ' + map[socket.username]);
    if (map[socket.username] != undefined) {
        map[socket.username]--;
        if (map[socket.username] == 0)
            delete map[socket.username];
    }
    //logger.info(map);
    onlineNotify(); 
}

var hi = function(socket, data) {
    if (map[data.username] == undefined)
        map[data.username] = 0;
    map[data.username]++;
    //logger.info(map);
    onlineNotify(); 

    socket.username = data.username;
    let historyDict = TWSE.getHistoryDict();
    for (let i=0 ; i<historyDict.length ; i++) {
        if (historyDict[i].testing != true)
            continue;
        if (historyDict[i].socket.username == socket.username) {
            testing = true;
            socket.emit('setup', {
                testing: testing,
                stock: historyDict[i].stock
            });
            break;
        }
    }
}

module.exports.init = init;
module.exports.broadcast = broadcast;
module.exports.addStock = addStock;
module.exports.connect = connect;
module.exports.disconnect = disconnect;
module.exports.addStockResult = addStockResult;
module.exports.hi = hi;
