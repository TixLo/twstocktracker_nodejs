var fs = require('fs');

var inited = false;

var StocksTable = {
};

var OTC = {};
var OTC2 = {};

var OTCInit = function() {
    let data = fs.readFileSync('./OTC.txt', {encoding:'utf8', flag:'r'});
    let lines = data.split('\n');
    for (let i=0 ; i<lines.length ; i++) {
        let p = lines[i].split(' ');
        OTC[p[0]] = p[1];
    }
}

var OTC2Init = function() {
    let data = fs.readFileSync('./OTC2.txt', {encoding:'utf8', flag:'r'});
    let lines = data.split('\n');
    for (let i=0 ; i<lines.length ; i++) {
        let p = lines[i].split(' ');
        OTC2[p[0]] = p[1];
    }
}

module.exports.init = function() {
    if (inited)
        return;

    inited = true;
    OTCInit();
    OTC2Init();

    /*
    let data = fs.readFileSync('./StockTable.txt', {encoding:'utf8', flag:'r'});
    let lines = data.split('\n');
    let idFlag = true;
    let stockId = '';
    let stockName = '';
    for (let i=0 ; i<lines.length ; i++) {
        if (lines[i].indexOf('<') >= 0)
            continue;
        if (idFlag == true) {
            stockId = lines[i];
            idFlag = false;
        }
        else {
            stockName = lines[i];
            idFlag = true;
            //console.log('    "' + stockId + '": "' + stockName + '",'); 
            StocksTable[stockId] = stockName;
        }
    }
    */
}

module.exports.get = function() {
    return StocksTable;
}

module.exports.getOTC = function() {
    return OTC;
}

module.exports.getOTC2 = function() {
    return OTC2;
}
