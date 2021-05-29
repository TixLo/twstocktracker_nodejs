var fs = require('fs');

var inited = false;

var StocksTable = {
};

module.exports.init = function() {
    if (inited)
        return;

    inited = true;
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
}

module.exports.get = function() {
    return StocksTable;
}
