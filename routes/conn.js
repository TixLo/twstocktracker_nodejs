var logger = require('log4js').getLogger('conn');
var TWSE = require('../controller/TWSE');
var stockdb = require('../controller/stockdb');

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

var deleteSavedStock = async function(socket, data) {
    logger.info(data);
    if (data.length > 0) {
        for (let i=0 ; i<data.length ; i++) {
            await stockdb.delStock(data[i]);
        }
        broadcast('updateSavedTable', {});
    }
    socket.emit('delSavedStockConfirm', {});
}

var refreshAllStock = async function(socket) {
    // 1. remove all stock_day
    await stockdb.delAllStockDay();
    logger.info('remove all');

    // 2. update all client's savedTable
    broadcast('updateSavedTable', {});

    // 3. retrigger fetch process for each stock
    let allStocks = await stockdb.getAllStock();
    logger.info(allStocks);
    if (allStocks.data != undefined) {
        for (let i=0 ; i<allStocks.data.length ; i++) {
            logger.info(allStocks.data[i]);
            let type = '';
            if (allStocks.data[i].stock_type == '上市')
                type = 'TYPE1';
            TWSE.pushFetchStockWithoutChecking(
                socket, allStocks.data[i].stock_no, type);
        }
    }
}

var addMonitorStocks = async function(socket, data) {
    logger.info(data);
    if (data == undefined || data.length == 0) {
        socket.emit('addMonitorStocksOK', {});
        return;
    }

    let stocks = await stockdb.getStock(data);
    logger.info(stocks);
    if (stocks.data == undefined) {
        socket.emit('addMonitorStocksOK', {});
        return;
    }

    logger.info('socket.usrname: ' + socket.username);
    let user = await stockdb.getUserByName(socket.username);
    logger.info(user);
    if (user.data == undefined) {
        socket.emit('addMonitorStocksOK', {});
        return;
    }

    await stockdb.removeUserStock(user.data[0]);
    for (let i=0 ; i<stocks.data.length ; i++) {
        let ret = await stockdb.addUserStock(
            user.data[0], stocks.data[i]);
    }
    socket.emit('addMonitorStocksOK', {});
}

var delUsers = async function(socket, data){
    logger.info(data);
    if (data == undefined || data.length == 0) {
        socket.emit('delUsersOK', {});
        return;
    }

    await stockdb.delUsers(data);
    socket.emit('delUsersOK', {});
}

var clearUsers = async function(socket, data){
    logger.info(data);
    if (data == undefined || data.length == 0) {
        socket.emit('delUsersOK', {});
        return;
    }

    for (let i=0 ; i<data.length ; i++) {
        let user = await stockdb.getUserByName(data[i]);
        if (user.data == undefined)
            continue;
        await stockdb.removeUserStock(user.data[0]);
    }
    socket.emit('delUsersOK', {});
}

module.exports.init = init;
module.exports.broadcast = broadcast;
module.exports.addStock = addStock;
module.exports.connect = connect;
module.exports.disconnect = disconnect;
module.exports.addStockResult = addStockResult;
module.exports.hi = hi;
module.exports.deleteSavedStock = deleteSavedStock;
module.exports.refreshAllStock = refreshAllStock;
module.exports.addMonitorStocks = addMonitorStocks;
module.exports.delUsers = delUsers;
module.exports.clearUsers = clearUsers;
