var TRADING_WAITING_BUY = 0;
var TRADING_WAITING_SELL = 1;
var semuStocks = {};

function fetch(stockId, url) {
    console.log(stockId + ',' + url);

    let stockData = undefined;
    $.ajax({
        async: false,
        type: 'GET',
        url: url,
        success: function(d){
            stockData = JSON.parse(d);
        }
    }).always(function(){
        if (stockData != undefined) {
            semuStocks[stockId] = stockData;
            if (stockData.RT != undefined) {
                stockData.Data.push(stockData.RT);
                //console.log(stockData);
            }
        }
    });
}

function getAllStockData(data) {
    for (let i=0 ; i<data.length ; i++) {
        //console.log(data[i]);
        let stockId = data[i].stock;
        if (semuStocks[stockId] != undefined)
            continue;

        let stockUrl = undefined;
        $.ajax({
            async: false,
            type: 'POST',
            url: '/stock/genstock',
            data: {
                stock: data[i].stock
            },
            success: function(d){
                //console.log(d);
                stockUrl = d.dataUrl;
            }
        }).always(function(){
            if (stockUrl != undefined)
                fetch(stockId, stockUrl);
        });
    }
    console.log(semuStocks);
}

function getValue(stock, type, val) {
    if (type == 'PRICE')
        return stock.closePrice;
    else if (type == 'CONST')
        return val;
    else
        return undefined;
}

var equation = {
    '>' : function (A,B) { return A > B;  },
    '>=': function (A,B) { return A >= B; },
    '<' : function (A,B) { return A < B;  },
    '<=': function (A,B) { return A <= B; },
    '=' : function (A,B) { return A == B;  },
    '!=': function (A,B) { return A != B; },
};

function comp(stock, A, E, B) {
    if (equation[E] == undefined)
        return false;

    let AVal = getValue(stock, A.type, A.value);
    let BVal = getValue(stock, B.type, B.value);
    if (AVal == undefined || BVal == undefined)
        return false;

    //console.log('AVal: ' + AVal + ', BVal: ' + BVal);
    //console.log(equation[E]);
    return equation[E](AVal, BVal);
}

function tradingBuy(stock) {
    if (stock.algo == undefined ||
        stock.algo.buy == undefined ||
        stock.algo.buy.length == 0)
        return false;

    let count = 0;
    stock.algo.buy.forEach(function(cond){
        if (comp(stock, cond.A, cond.E, cond.B)) {
            count++;
        }
    });
    return (count == stock.algo.buy.length);
}

function tradingSell(stock) {
    if (stock.algo == undefined ||
        stock.algo.sell == undefined ||
        stock.algo.sell.length == 0)
        return false;

    let count = 0;
    stock.algo.sell.forEach(function(cond){
        if (comp(stock, cond.A, cond.E, cond.B)) {
            count++;
        }
    });
    return (count == stock.algo.sell.length);
}

function calc(stock) {
    let id = stock.StockId;
    let name = stock.Name;
    stock.date = '';
    stock.closePrice = 0;
    stock.tradingStatus = TRADING_WAITING_BUY;
    stock.status = '';
    stock.K = 0;
    stock.D = 0;
    stock.RSV = 0;
    stock.ma5 = 0;
    stock.ma10 = 0;
    stock.ma20 = 0;
    stock.ma40 = 0;
    stock.ma60 = 0;
    stock.prices = [];
    stock.ma5Data = [];
    stock.ma10Data = [];
    stock.ma20Data = [];
    stock.ma40Data = [];
    stock.ma60Data = [];

    let snapshot = function() {
        return  {
            date: stock.date,
            price: stock.closePrice,
            K: stock.K,
            D: stock.D,
            ma5: stock.ma5,
            ma10: stock.ma10,
            ma20: stock.ma20,
            ma40: stock.ma40,
            ma60: stock.ma60
        };
    }
    stock.buy = undefined;
    stock.sell = undefined;

    let incTrade = function() {
        stock.trades.push({
            buy: stock.buy,
            sell: stock.sell,
            delta: stock.sell.price - stock.buy.price
        });
        if (stock.sell.date != 'RealTime') {
            stock.buy = undefined;
            stock.sell = undefined;
        }
    }
    stock.trades = [];

    //for test
    stock.algo = {
        buy: [
            {
                A: {type: 'PRICE'},
                E: '<',
                B: {type: 'CONST', value: 58}
            }
        ],
        sell: [
            {
                A: {type: 'PRICE'},
                E: '>',
                B: {type: 'CONST', value: 62}
            }
        ]
    };

    let ma = function(array, val, len) {
        if (array.length >= len)
            array.splice(0,1);
        array.push(val);
        if (array.length < len)
            return 0;
        let sum = 0;
        for (let i=0 ; i<len ; i++) {
            sum += array[i];
        }
        return sum / len;
    }

    let push2NewData = function(data) {
        data.push(stock.ma5);      
        data.push(stock.ma10);
        data.push(stock.ma20);      
        data.push(stock.ma40);      
        data.push(stock.ma60);      
        data.push(stock.K); 
        data.push(stock.D);      
        data.push(stock.RSV);
        newData.push(data);
    }

    let newData = [];
    for (let i=0 ; i<stock.Data.length ; i++) {
        stock.date = stock.Data[i][STOCK_DATE];
        stock.closePrice = stock.Data[i][STOCK_CLOSE_PRICE];
        //console.log(stock.date + ':' + stock.closePrice);

        ///////////////////////////////////////////////////////
        // calculate RSV in according to RSV_N (default: 9)
        ///////////////////////////////////////////////////////
        let maxPrice = -1;
        let minPrice = 10000;
        if (stock.prices.length >= RSV_N)
            stock.prices.splice(0,1);
        stock.prices.push(stock.closePrice);
        if (stock.prices.length < RSV_N) {
            push2NewData(stock.Data[i]);
            continue;
        }

        //console.log('stock.prices.length: ' + stock.prices.length + ', RSV_N:' + RSV_N);
        stock.prices.forEach(function(item) {
            maxPrice = Math.max(maxPrice, item);
            minPrice = Math.min(minPrice, item);
            //console.log(item);
        });
        //console.log('max: ' + maxPrice + ', min:' + minPrice);
        stock.RSV = Math.round((stock.closePrice - minPrice) * 100 / (maxPrice - minPrice));
        //console.log('RSV: ' + stock.RSV);

        ///////////////////////////////////////////////////////
        // calculate K & D
        ///////////////////////////////////////////////////////
        stock.K = Math.round((2 * stock.K / 3) + (stock.RSV / 3));
        stock.D = Math.round((2 * stock.D / 3) + (stock.K / 3));
        //console.log('K: ' + stock.K + ', D:' + stock.D);

        ///////////////////////////////////////////////////////
        // calculate all kinds of MA
        ///////////////////////////////////////////////////////
        stock.ma5 = ma(stock.ma5Data, stock.closePrice, 5);
        stock.ma10 = ma(stock.ma10Data, stock.closePrice, 10);
        stock.ma20 = ma(stock.ma20Data, stock.closePrice, 20);
        stock.ma40 = ma(stock.ma40Data, stock.closePrice, 40);
        stock.ma60 = ma(stock.ma60Data, stock.closePrice, 60);
        //console.log('[' + i + ']:' + stock.closePrice + ', ma5: ' + stock.ma5);

        ///////////////////////////////////////////////////////
        // trade simulation
        ///////////////////////////////////////////////////////
        if (stock.tradingStatus == TRADING_WAITING_BUY) {
            if (tradingBuy(stock)) {
                stock.status = '[買入] 日期:' + stock.date + ', 價格:' + stock.closePrice.toFixed(2);
                stock.tradingStatus = TRADING_WAITING_SELL;
                stock.buy = snapshot();
            }
        }
        else if (stock.tradingStatus == TRADING_WAITING_SELL) {
            if (tradingSell(stock)) {
                stock.status = '[賣出] 日期:' + stock.date + ', 價格:' + stock.closePrice.toFixed(2);
                stock.tradingStatus = TRADING_WAITING_BUY;
                stock.sell = snapshot();
                incTrade();
            }
        }

        ///////////////////////////////////////////////////////
        // append to original data array
        ///////////////////////////////////////////////////////
        push2NewData(stock.Data[i]);
    }
    stock.Data = newData;
    //console.log(stock);
    return stock;
}

function updateTable(stock) {
    let win = 0;
    let lose = 0;
    let totalDelta = 0;
    let winRate = 0;
    if (stock.trades.length > 0) {
        for (let i=0 ; i<stock.trades.length ; i++) {
            if (stock.trades[i].delta > 0)
                win++;
            else
                lose++;
            totalDelta += stock.trades[i].delta;
        }
        winRate = (win + lose) * 100.0 / stock.trades.length;
    }

    $('#dealCount_' + stock.StockId).text(stock.trades.length);
    $('#winRate_' + stock.StockId).text(winRate.toFixed(2) + '%');
    $('#profit_' + stock.StockId).text(totalDelta.toFixed(2))

    if (stock.buy == undefined && stock.sell == undefined) {
        $('#status_' + stock.StockId).text('');
    }
    else if (stock.buy != undefined && stock.sell == undefined) {
        $('#status_' + stock.StockId).text(stock.status);
        if (stock.buy.date == 'RealTime') {
            $('#status_' + stock.StockId).attr('class', 'text-primary');
        }
    }
    else if (stock.buy != undefined && stock.sell != undefined) {
        let status = '[下車!!] 買入(' + stock.buy.date + ', ' + stock.buy.price
                    + ') -> 目前價格: ' + stock.sell.price
                    + ', 價差: ' + (stock.sell.price - stock.buy.price).toFixed(2); 
        $('#status_' + stock.StockId).text(status);
        $('#status_' + stock.StockId).attr('class', 'text-primary');
       
    }
    else {
        $('#status_' + stock.StockId).attr('class', '');
    }
}

function semu(data) {
    // 1. get all stock data
    getAllStockData(data);

    // 2. calculate for each stock 
    let newSemuStocks = {};
    for (const [key, value] of Object.entries(semuStocks)) {
        newSemuStocks[key] = calc(value);

        // 3. update observedStock table
        updateTable(newSemuStocks[key]);
    }
}

function genTradeHistory(stockId) {
    //console.log('genTradeHistory');
    //console.log(semuStocks);

    if (semuStocks[stockId] == undefined)
        return;

    let shiftDate = function(date, days) {
        let t = new Date(date).getTime();
        t += (days * (24 * 60 * 60 * 1000));
        let t2 = new Date(t);
        let yyyy = t2.getFullYear().toString();
        let mm = (t2.getMonth() + 1).toString();
        let dd = t2.getDate().toString();
        return mm + '/' + dd + '/' + yyyy;
    }

    let html = '';
    let tradeCost = 0.585; //%
    let totalProfit = 0;
    let totalDelta = 0;
    let totalCost = 0;
    let dayOneCost = 0;
    for (let i=0 ; i<semuStocks[stockId].trades.length ; i++) {
        trade = semuStocks[stockId].trades[i];
        
        let deltaPrice = trade.sell.price - trade.buy.price;

        //begin
        html += '<tr>\n';

        html += '<td>'+ (i + 1) + '</td>\n';

        html += '<td>'+ trade.buy.date + ' -> ' + trade.sell.date + '</td>\n';

        html += '<td>'+ trade.buy.price + ' -> ' + trade.sell.price 
             + '  (價差: ' + deltaPrice.toFixed(2) + ')</td>\n';

        let profit = (deltaPrice) * 100.0 / trade.buy.price - tradeCost;
        html += '<td>'+ profit.toFixed(2) + '%</td>\n';
        totalProfit += profit;
        if (dayOneCost == 0) {
            dayOneCost = trade.buy.price;
            totalCost = trade.buy.price;
        }
        totalCost += deltaPrice * (1.0 - tradeCost / 100.0);

        // button
        let b = shiftDate(trade.buy.date, -14);
        let e = shiftDate(trade.sell.date, 14);
        console.log(b + '->' + e);
        html += '<td>\n';
        html += '<img class="Image pt-0 pb-0" '
              + 'src="../images/details.png" width="26" height="26" '
              + 'onClick="focusTradeStockPeriod(\'' + stockId + '\',\'' + b + '\',\'' + e + '\')">\n';
        html += '</td>\n';

        //end
        html += '</tr>\n';
    }

    $('#tradeHistoryBody').html(html);
    $('#tradeTotalCount').text(semuStocks[stockId].trades.length);
    $('#tradeTotalProfit').text(totalProfit.toFixed(2) + '%');

    let startDateStr = semuStocks[stockId].Data[0][STOCK_DATE];
    let endDateStr = semuStocks[stockId].Data[semuStocks[stockId].Data.length - 2][STOCK_DATE];

    let startDate = new Date(startDateStr);
    let endDate = new Date(endDateStr);

    let msPerYear = 365 * 24 * 60 * 60 * 1000.0;
    let year = (endDate.getTime() - startDate.getTime()) / msPerYear;

    if (totalCost <= 0 || year < 1.0) {
        $('#tradeYearProfit').text(' - ');
        return;
    }
    //console.log('totalCost: ' + totalCost);
    //console.log('dayOneCost: ' + dayOneCost);
    let yearProfit = (Math.pow(totalCost/dayOneCost, 1.0 / year) - 1) * 100.0;
    $('#tradeYearProfit').text(yearProfit.toFixed(2) + '%');
}

