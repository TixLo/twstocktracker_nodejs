// 設定線圖區域的 w/h/margin
var margin = { top: 40, right: 130, bottom: 30, left: 100 };
var width = $('#stockArea').width() - margin.left - margin.right;
var height = 600 - margin.top - margin.bottom;
var KDH = 70;
var volumeH = 70;

var svg = undefined;

// 設定 x 軸, 且以時間為單位
var x = techan.scale.financetime().range([0, width]);
var xBottomAxis = d3.axisBottom(x);
var xTopAxis = d3.axisTop(x);

// y軸 : [0 ~ height]
var fullY = d3.scaleLinear().range([height, 0]);
var y = d3.scaleLinear().range([height - volumeH - KDH, 0]);
var yLeftAxis = d3.axisLeft(y);
var yVolume = d3.scaleLinear().range([height, height - volumeH]);
var yKD = d3.scaleLinear().range([height - volumeH - 5, height - volumeH - KDH + 5]).domain([0,100]);


// 資料日期格式 "2019/01/28"
var parseDate = d3.timeParse("%Y/%m/%d");

// 設定十字線下面顯示的時間, 格式'2010/01/01'
var timeAnnotation = techan.plot.axisannotation()
    .axis(xBottomAxis)
    .orient('bottom')
    .format(d3.timeFormat('%Y/%m/%d')) // 顯示日期的格式 2019/03/19
    .width(120)
    .height(22)
    .translate([0, height]);
var timeTopAnnotation = techan.plot.axisannotation()
    .axis(xTopAxis)
    .format(d3.timeFormat('%Y/%m/%d')) // 顯示日期的格式 2019/03/19
    .width(120)
    .height(22)
    .orient('top');

var volumeAxis = d3.axisLeft(yVolume)
        .ticks(3)
        .tickFormat(d3.format(",.3s"));

var KDAxis = d3.axisLeft(yKD)
        .ticks(3)
        .tickFormat(d3.format(",.0s"));

// 紀錄滑鼠移到的資料
var allStockData = undefined;

// 設定即時顯示文字區塊
var dynamicText = [];

function addDynamicText(label, h) {
    var text = svg.append('text')
        .style("text-anchor", "begin")
        .attr("class", "moveLabel")
        .attr("x", width + 10)
        .attr("y", h);

    dynamicText.push({
        label: label,
        svgText: text
    });
    return h + 22;
}

// MA線圖圖示
function drawMAIndicator(label, startPos, color) {
    var data = [
        [startPos, -20],
        [startPos + 30, -20]
    ];
    var line = d3.line();
    svg.append("path")
        .attr("d", line(data))
        .attr("stroke", color)
        .attr("stroke-width", "4px")
        .attr("fill", "none");

    svg.append('text')
        .style("text-anchor", "begin")
        .attr("class", "coords")
        .attr("x", startPos + 40)
        .attr("y", -15)
        .text(label);

    return startPos + 90;
}

function removeStockGraph() {
    if (svg == undefined)
        return;
    svg.remove();
    svg = undefined;
    $('#stockArea').empty();
}

function initStockGraph(dataFile, options) {

    // init
    dynamicText = [];

    //設定畫圖區域
    svg = d3.select('#stockArea').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // draw top line
    var topAxisData = [ 
        [0, 0], 
        [width, 0]
    ];
    var line = d3.line();
    svg.append("path")
        .attr("d", line(topAxisData))
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("fill", "none");

    // draw seperate line
    var firstAxisData = [ 
        [0, height - volumeH - KDH], 
        [width, height - volumeH - KDH]
    ];
    svg.append("path")
        .attr("d", line(firstAxisData))
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("stroke-dasharray", "2")
        .attr("fill", "none");

    var secondAxisData = [ 
        [0, height - volumeH], 
        [width, height - volumeH]
    ];
    svg.append("path")
        .attr("d", line(secondAxisData))
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("stroke-dasharray", "2")
        .attr("fill", "none");

    // setup candlestick
    var candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

    // 設定十字線左邊要顯示的文字
    var ohlcAnnotation = techan.plot.axisannotation()
        .axis(yLeftAxis)
        .orient('left')
        .width(70)
        .height(22)
        .format(d3.format(',.2f'));

    // 設定十字線
    var crosshair = techan.plot.crosshair()
        .xScale(x)
        .yScale(fullY)
        .xAnnotation([timeAnnotation])
        .yAnnotation([ohlcAnnotation])
        .on("move", move);

    // trade mark
    var tradearrow = techan.plot.tradearrow()
            .xScale(x)
            .yScale(y)
            .y(function(d) {
                return y(d.price);
            });

    var h = 50;
    h = addDynamicText('', h);
    h = addDynamicText('', h);
    h = addDynamicText('開盤', h);
    h = addDynamicText('最高', h);
    h = addDynamicText('最低', h);
    h = addDynamicText('收盤', h);
    h = addDynamicText('MA5', h);
    h = addDynamicText('MA10', h);
    h = addDynamicText('MA20', h);
    h = addDynamicText('MA40', h);
    h = addDynamicText('MA60', h);
    h = addDynamicText('RSV', h);
    h = addDynamicText('K9', h);
    h = addDynamicText('D9', h);
    h = addDynamicText('交易量', h);

    var stockName = '';
    var stockId = '';
    d3.json(dataFile, function(error, data) {
        var accessor = candlestick.accessor();
        var jsonData = data["Data"];
        stockName = data.Name;
        stockId = data.StockId;
        var dataLength = data.Data.length;
        data = jsonData.map(function(d) {
            return {
                date: parseDate(d[STOCK_DATE]),
                dateTime: new Date(parseDate(d[STOCK_DATE])).getTime(),
                open: +d[STOCK_OPEN_PRICE],
                high: +d[STOCK_HIGHEST_PRICE],
                low: +d[STOCK_LOWEST_PRICE],
                close: +d[STOCK_CLOSE_PRICE],
                volume: +d[STOCK_VOLUME],
                ma5: +d[STOCK_MA5],
                ma10: +d[STOCK_MA10],
                ma20: +d[STOCK_MA20],
                ma40: +d[STOCK_MA40],
                ma60: +d[STOCK_MA60],
                k9: +d[STOCK_K],
                d9: +d[STOCK_D],
                rsv: +d[STOCK_RSV],
            };
        }).sort(function(a, b) {
            return d3.ascending(accessor.d(a), accessor.d(b));
        });

        allStockData = data;

        // x 軸資料
        x.domain(data.map(accessor.d));
        var X = d3.scaleLinear().range([0, width]).domain([0, dataLength - 1]);

        // y 軸資料
        y.domain(techan.scale.plot.ohlc(data, accessor).domain());
        var Y = d3.scaleLinear().range([height - volumeH - KDH, 0]).domain(y.domain());

        // KD
        var k9 = d3.line().curve(d3.curveCardinal)
            .x(function(d) { return x(d.date); })
            .y(function(d) { return yKD(d.k9); });
        svg.append("g").attr("id", "k9").append("path").attr("class", "line");
        svg.select("g#k9 path").datum(data).attr("d", k9);
        svg.append('text')
            .style("text-anchor", "begin")
            .attr("class", "coords")
            .style('fill', '#0000FF')
            .attr("x", 10)
            .attr("y", height - volumeH - KDH + 15)
            .text('K9');

        var d9 = d3.line().curve(d3.curveCardinal)
            .x(function(d) { return x(d.date); })
            .y(function(d) { return yKD(d.d9); });
        svg.append("g").attr("id", "d9").append("path").attr("class", "line");
        svg.select("g#d9 path").datum(data).attr("d", d9);
        svg.append('text')
            .style("text-anchor", "begin")
            .attr("class", "coords")
            .style('fill', '#E69500')
            .attr("x", 10)
            .attr("y", height - volumeH - KDH + 35)
            .text('D9');
    
        // draw candlestick
        svg.append("g")
            .datum(data)
            .attr("class", "candlestick")
            .call(candlestick);

        // 交易量
        yVolume.domain(techan.scale.plot.volume(data).domain());
        var volume = techan.plot.volume()
            .accessor(candlestick.accessor())
            .xScale(x)
            .yScale(yVolume);

        svg.append("g")
            .datum(data)
            .attr("class", "volume")
            .call(volume);

        // 顯示名稱
        svg.append('text')
            .style("text-anchor", "begin")
            .attr("class", "coords")
            .attr("x", width / 2 - 50)
            .attr("y", 20)
            .text(stockName + '[' + stockId + ']');

        // draw MA
        let startMAPos = 60;
        if (options.ma5) {
            startMAPos = drawMAIndicator('5MA', startMAPos, '#1f77b4');
            var ma5 = d3.line().curve(d3.curveCardinal)
                .x(function(d) { return x(d.date); })
                .y(function(d) {return y(Math.min(Math.max(d.ma5, y.domain()[0]), y.domain()[1])); });
            svg.append("g").attr("id", "ma-5").append("path").attr("class", "line");
            svg.select("g#ma-5 path").datum(data).attr("d", ma5);
        }
        if (options.ma10) {
            startMAPos = drawMAIndicator('10MA', startMAPos, '#aec7e8');
            var ma10 = d3.line().curve(d3.curveCardinal)
                .x(function(d) { return x(d.date); })
                .y(function(d) {return y(Math.min(Math.max(d.ma10, y.domain()[0]), y.domain()[1])); });
            svg.append("g").attr("id", "ma-10").append("path").attr("class", "line");
            svg.select("g#ma-10 path").datum(data).attr("d", ma10);
        }
        if (options.ma20) {
            startMAPos = drawMAIndicator('20MA', startMAPos, '#9E9E00');
            var ma20 = d3.line().curve(d3.curveCardinal)
                .x(function(d) { return x(d.date); })
                .y(function(d) {return y(Math.min(Math.max(d.ma20, y.domain()[0]), y.domain()[1])); });
            svg.append("g").attr("id", "ma-20").append("path").attr("class", "line");
            svg.select("g#ma-20 path").datum(data).attr("d", ma20);
        }
        if (options.ma40) {
            startMAPos = drawMAIndicator('40MA', startMAPos, '#F0F000');

            var ma40 = d3.line().curve(d3.curveCardinal)
                .x(function(d) { return x(d.date); })
                .y(function(d) {return y(Math.min(Math.max(d.ma40, y.domain()[0]), y.domain()[1])); });
            svg.append("g").attr("id", "ma-40").append("path").attr("class", "line");
            svg.select("g#ma-40 path").datum(data).attr("d", ma40);
        }
        if (options.ma60) {
            startMAPos = drawMAIndicator('60MA', startMAPos, '#FF30FF');

            var ma60 = d3.line().curve(d3.curveCardinal)
                .x(function(d) { return x(d.date); })
                .y(function(d) {return y(Math.min(Math.max(d.ma60, y.domain()[0]), y.domain()[1])); });
            svg.append("g").attr("id", "ma-60").append("path").attr("class", "line");
            svg.select("g#ma-60 path").datum(data).attr("d", ma60);
        }

        // draw x axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xBottomAxis
                .ticks(5)
                .tickFormat(d3.timeFormat("%Y/%m/%d"))
                .tickSize(-height, -height)
            );

        svg.append("g")
            .attr("class", "y axis")
            .call(yLeftAxis);

        svg.append("g")
            .attr("class", "volume axis");
        svg.select("g.volume.axis").call(volumeAxis);

        svg.append("g")
            .attr("class", "kd axis");
        svg.select("g.kd.axis").call(KDAxis);

        // draw crosshair
        svg.append('g')
            .attr("class", "crosshair")
            .datum({ x: x.domain()[80], y: 67.5 })
            .call(crosshair)
            .each(function(d) { move(d); });

        var getXIndex = function(inDate) {
            var inDateTime = new Date(inDate).getTime();
            let xData = x.domain();
            for (let i=0 ; i<xData.length ; i++) {
                let item = xData[i];
                let itemDateTime = new Date(item).getTime();
                if (itemDateTime == inDateTime)
                    return i;
            }
            return -1;
        }

        if (options.trade) {
            let trades = []
            if (options.buy) {
                options.buy.forEach(function(item){
                    var buyIdx = getXIndex(item.date);
                    if (buyIdx < 0)
                        return;
                    trades.push({ date: data[buyIdx].date, type: "buy", price: item.price })
                });
            }
            if (options.sell) {
                options.sell.forEach(function(item){
                    var sellIdx = getXIndex(item.date);
                    if (sellIdx < 0)
                        return;
                    trades.push({ date: data[sellIdx].date, type: "sell", price: item.price })
                });
            }
    
            svg.append("g").attr("class", "tradearrow");
            svg.select("g.tradearrow").datum(trades).call(tradearrow);
        }
        //console.log(data);
    });
}

function move(coords) {
    if (allStockData == undefined)
        return;

    for (let i = 0; i < allStockData.length; i++) {
        if (coords.x == allStockData[i].date) {
            dynamicText[1].svgText.text(timeAnnotation.format()(coords.x));
            dynamicText[2].svgText.text(dynamicText[2].label + ':' + allStockData[i].open);
            dynamicText[3].svgText.text(dynamicText[3].label + ':' + allStockData[i].high);
            dynamicText[4].svgText.text(dynamicText[4].label + ':' + allStockData[i].low);
            dynamicText[5].svgText.text(dynamicText[5].label + ':' + allStockData[i].close);
            dynamicText[6].svgText.text(dynamicText[6].label + ':' + allStockData[i].ma5);
            dynamicText[7].svgText.text(dynamicText[7].label + ':' + allStockData[i].ma10);
            dynamicText[8].svgText.text(dynamicText[8].label + ':' + allStockData[i].ma20);
            dynamicText[9].svgText.text(dynamicText[9].label + ':' + allStockData[i].ma40);
            dynamicText[10].svgText.text(dynamicText[10].label + ':' + allStockData[i].ma60);
            dynamicText[11].svgText.text(dynamicText[11].label + ':' + allStockData[i].rsv);
            dynamicText[12].svgText.text(dynamicText[12].label + ':' + allStockData[i].k9);
            dynamicText[13].svgText.text(dynamicText[13].label + ':' + allStockData[i].d9);
            dynamicText[14].svgText.text(dynamicText[14].label + ':' + allStockData[i].volume);
        }
    }
}

