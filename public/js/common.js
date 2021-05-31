var socket = undefined;

var onlineCB = function(json) {}
var setupCB = function(json) {}
var addStockResultCB = function(json) {}
var updateQueuedTableCB = function(json) {}
var updateSavedTableCB = function(json) {}
var delSavedStockConfirmCB = function(json) {}
var addMonitorStocksOKCB = function(json) {}
var delUsersOKCB = function(json) {}

var initSocketIO = function() {
    socket = io.connect();

    // username in banner.ejs
    socket.emit('hi', {username:$('#username').text()});

    // for warehouse
    socket.on('online', onlineCB);
    socket.on('setup', setupCB);
    socket.on('addStockResult', addStockResultCB);
    socket.on('updateQueuedTable', updateQueuedTableCB);
    socket.on('updateSavedTable', updateSavedTableCB);
    socket.on('delSavedStockConfirm', delSavedStockConfirmCB);
    socket.on('addMonitorStocksOK', addMonitorStocksOKCB);
    socket.on('delUsersOK', delUsersOKCB);

    return socket;
}

var registryOnlineCB = function(cb) {
    onlineCB = cb;
}

var registrySetupCB = function(cb) {
    setupCB = cb;
}

var registryAddStockResultCB = function(cb) {
    addStockResultCB = cb;
}

var registryUpdateQueuedTableCB = function(cb) {
    updateQueuedTableCB = cb;
}

var registryUpdateSavedTableCB = function(cb) {
    updateSavedTableCB = cb;
}

var registryDelSavedStockConfirmCB = function(cb) {
    delSavedStockConfirmCB = cb;
}

var registryAddMonitorStocksOKCB = function(cb) {
    addMonitorStocksOKCB = cb;
}

var registryDelUsersOKCB = function(cb) {
    delUsersOKCB = cb;
}
