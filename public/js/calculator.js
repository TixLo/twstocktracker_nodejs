var TRADING_WAITING_BUY = 0;
var TRADING_WAITING_SELL = 1;
var semuStocks = {};
let tradeCost = 0.585; //%

function fetch(stockId, url) {
    //console.log(stockId + ',' + url);

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
    //console.log(semuStocks);
}

function getValue(stock, type, val) {
    if (type == 'PRICE')
        return stock.closePrice;
    else if (type == '5MA')
        return stock.ma5;
    else if (type == '10MA')
        return stock.ma10;
    else if (type == '20MA')
        return stock.ma20;
    else if (type == '40MA')
        return stock.ma40;
    else if (type == '60MA')
        return stock.ma60;
    else if (type == 'K9')
        return stock.K;
    else if (type == 'D9')
        return stock.D;
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

function comp(stock, cond) {
    if (cond.E == 'trendUp' || cond.E == 'trendDown') {
        if (cond.valArray == undefined)
            cond.valArray = [];
        
        let AVal = getValue(stock, cond.A.type, cond.A.value);
        cond.valArray.push(AVal);
        if (cond.valArray.length > cond.C)
            cond.valArray.splice(0,1);
        if (cond.valArray.length < cond.C)
            return false;

        for (let i=1 ; i<cond.valArray.length ; i++) {
            if (cond.E == 'trendUp') {
                if (cond.valArray[i] - cond.valArray[i-1] <= 0)
                    return false;
            }
            else if (cond.E == 'trendDown') {
                if (cond.valArray[i] - cond.valArray[i-1] >= 0)
                    return false;
            }
            else
                return false;
        }
        cond.valArray = undefined;
        return true;
    }
    else if (cond.A.type == 'StopLoss') {
        let BVal = getValue(stock, cond.B.type, cond.B.value);
        let targetPrice = (1.0 + (parseFloat(BVal) / 100.0)) * stock.buy.price;
        return (stock.closePrice <= targetPrice)
    }
    
    if (equation[cond.E] == undefined)
        return false;

    let AVal = getValue(stock, cond.A.type, cond.A.value);
    let BVal = getValue(stock, cond.B.type, cond.B.value);
    if (AVal == undefined || BVal == undefined)
        return false;

    //console.log('AVal: ' + AVal + ',' + cond.E + ', BVal: ' + BVal + ', C: ' + cond.C + ', V: ' + cond.val);
    if (equation[cond.E](AVal, BVal)) {
        if (cond.val == undefined)
            cond.val = 0;
        cond.val++;
        if (cond.val >= cond.C) {
            cond.val = 0;
            return true;
        }
        return false;
    }
    else {
        cond.val = 0;
        return false;
    }
}

function tradingBuy(stock) {
    if (stock.algo == undefined ||
        stock.algo.buy == undefined ||
        stock.algo.buy.length == 0)
        return false;

    let count = 0;
    stock.algo.buy.forEach(function(cond){
        if (comp(stock, cond)) {
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
    let stopLossCriteria = false;
    stock.algo.sell.forEach(function(cond){
        if (comp(stock, cond)) {
            if (cond.A.type == 'StopLoss') {
                stopLossCriteria = true;
            }
            
            count++;
        }
        else if (cond.A.type == 'StopLoss')
            count++;
    });
    return ((count == stock.algo.sell.length) || stopLossCriteria);
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
            ma60: stock.ma60,
            realtime: false
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
        //if (stock.sell.realtime == true) {
        //    stock.buy = undefined;
        //    stock.sell = undefined;
        //}
    }
    stock.trades = [];

    //for test
    stock.algo = {
        buy: [],
        sell: []
        //buy: [
        //    {
        //        A: {type: 'PRICE'},
        //        E: '<',
        //        B: {type: 'CONST', value: 900},
        //        C: 2
        //    }
        //],
        //sell: [
        //    {
        //        A: {type: 'PRICE'},
        //        E: '>',
        //        B: {type: 'CONST', value: 62},
        //        C: 3
        //   }
        //]
    };

    if (buyAlgo != undefined)
        stock.algo.buy = buyAlgo;
    if (sellAlgo != undefined)
        stock.algo.sell = sellAlgo;
    //console.log(stock.algo);
    if (stock.algo.buy.length > 0) {
        stock.algo.buy.forEach(function(item){
            item.val = 0;
        });
    }

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
            else if (i == stock.Data.length - 1) {
                stock.status = '[持有中] 買入日期:' + stock.buy.date
                             + ', 買入價格:' + stock.buy.price
                             + ', 目前價格:' + stock.closePrice;
                stock.sell = snapshot();
                stock.sell.realtime = true;;
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
    let totalProfit = 0;
    let winRate = 0;
    if (stock.trades.length > 0) {
        for (let i=0 ; i<stock.trades.length ; i++) {
            let profit = (stock.trades[i].delta) * 100.0 / stock.trades[i].buy.price - tradeCost;
            if (profit > 0)
                win++;
            else
                lose++;
            totalProfit += profit;
        }
        winRate = win * 100.0 / stock.trades.length;
    }

    $('#dealCount_' + stock.StockId).text(stock.trades.length);
    $('#winRate_' + stock.StockId).text(winRate.toFixed(2) + '%');
    $('#profit_' + stock.StockId).text(totalProfit.toFixed(2) + '%')

    if (stock.buy == undefined && stock.sell == undefined) {
        $('#status_' + stock.StockId).text('');
    }
    else if (stock.buy != undefined && stock.sell == undefined) {
        $('#status_' + stock.StockId).text(stock.status);
        if (stock.buy.realtime == true) {
            $('#status_' + stock.StockId).attr('class', 'text-primary');
        }
    }
    else if (stock.buy != undefined && stock.sell != undefined) {
        let status = '';
        if (stock.sell.realtime == true) {
        //    status = stock.status;
        //}
        //else {
            status = '[持有中] 買入(' + stock.buy.date + ', ' + stock.buy.price
                    + ') -> 目前價格: ' + stock.sell.price
                    + ', 價差: ' + (stock.sell.price - stock.buy.price).toFixed(2); 
        }
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
        return undefined;

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
    let totalProfit = 0;
    let totalDelta = 0;
    let totalCost = 0;
    let dayOneCost = 0;
    //for (let i=0 ; i<semuStocks[stockId].trades.length ; i++) {
    for (let i=semuStocks[stockId].trades.length - 1 ; i>=0 ; i--) {
        trade = semuStocks[stockId].trades[i];
        
        let deltaPrice = trade.sell.price - trade.buy.price;

        //begin
        html += '<tr>\n';

        html += '<td>'+ (semuStocks[stockId].trades.length - i) + '</td>\n';

        if (trade.sell.realtime == true)
            html += '<td>'+ trade.buy.date + ' -> 持有中！</td>\n';
        else
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
        //console.log(b + '->' + e);
        html += '<td>\n';
        html += '<img class="Image pt-0 pb-0" '
              + 'src="../images/details.png" width="26" height="26" '
              + 'onClick="focusTradeStockPeriod(\'' + stockId + '\',\'' + b + '\',\'' + e + '\','
              + (trade.buy.price.toFixed(2)) + ','  // buy price
              + (trade.sell.price.toFixed(2)) + ','  // sell price
              + '\'' + (trade.buy.date) + '\','  // buy date index
              + '\'' + (trade.sell.date) + '\''  // sell date index
              + ')">\n';
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
        return semuStocks[stockId].trades;
    }
    //console.log('totalCost: ' + totalCost);
    //console.log('dayOneCost: ' + dayOneCost);
    let yearProfit = (Math.pow(totalCost/dayOneCost, 1.0 / year) - 1) * 100.0;
    $('#tradeYearProfit').text(yearProfit.toFixed(2) + '%');
    return semuStocks[stockId].trades;
}

