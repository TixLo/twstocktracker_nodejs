var socket = undefined;

var onlineCB = function(json) {}
var setupCB = function(json) {}
var addStockResultCB = function(json) {}
var updateQueuedTableCB = function(json) {}
var updateSavedTableCB = function(json) {}

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
