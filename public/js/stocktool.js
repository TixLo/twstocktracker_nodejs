// 設定線圖區域的 w/h/margin
var margin = { top: 40, right: 120, bottom: 30, left: 80 };
var width = $('#stockArea').width() - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;

var svg = undefined;

// 設定 x 軸, 且以時間為單位
var x = techan.scale.financetime().range([0, width]);
var xBottomAxis = d3.axisBottom(x);

// y軸 : [0 ~ height]
var y = d3.scaleLinear().range([height, 0]);
var yLeftAxis = d3.axisLeft(y);

// 設定十字線下面顯示的時間, 格式'2010/01/01'
var timeAnnotation = techan.plot.axisannotation()
    .axis(xBottomAxis)
    .orient('bottom')
    .format(d3.timeFormat('%Y/%m/%d')) // 顯示日期的格式 2019-03-19
    .width(120)
    .height(22)
    .translate([0, height]);


// 紀錄滑鼠移到的資料
var allStockData = undefined;

// 設定即時顯示文字區塊
var dynamicText = [];

function addDynamicText(label, h) {
    var text = svg.append('text')
        .style("text-anchor", "begin")
        .attr("class", "coords")
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
    // 股票資料索引值
    var STOCK_DATE = 0;
    var STOCK_OPEN_PRICE = 1;
    var STOCK_HIGHEST_PRICE = 2;
    var STOCK_LOWEST_PRICE = 3;
    var STOCK_CLOSE_PRICE = 4;
    var STOCK_VOLUME = 6;
    var STOCK_5MA = 10; 
    var STOCK_20MA = 11; 
    var STOCK_60MA = 12; 

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

    // setup candlestick
    var candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

    // 資料日期格式 "2019/01/28"
    var parseDate = d3.timeParse("%Y/%m/%d");

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
        .yScale(y)
        .xAnnotation([timeAnnotation])
        .yAnnotation([ohlcAnnotation])
        .on("move", move);

    // 均線
    var sma5 = techan.plot.sma().xScale(x).yScale(y);
    var sma10 = techan.plot.sma().xScale(x).yScale(y);
    var sma20 = techan.plot.sma().xScale(x).yScale(y);
    var sma60 = techan.plot.sma().xScale(x).yScale(y);

    var h = 50;
    h = addDynamicText('', h);
    h = addDynamicText('開盤', h);
    h = addDynamicText('最高', h);
    h = addDynamicText('最低', h);
    h = addDynamicText('收盤', h);

    var stockName = '';
    var stockId = '';
    d3.json(dataFile, function(error, data) {
        var accessor = candlestick.accessor();
        var jsonData = data["Data"];
        stockName = data.Name;
        stockId = data.StockId;
        data = jsonData.map(function(d) {
            return {
                date: parseDate(d[STOCK_DATE]),
                open: +d[STOCK_OPEN_PRICE],
                high: +d[STOCK_HIGHEST_PRICE],
                low: +d[STOCK_LOWEST_PRICE],
                close: +d[STOCK_CLOSE_PRICE],
                volume: +d[STOCK_VOLUME],
                MA5: +d[STOCK_5MA],
                MA20: +d[STOCK_20MA],
                MA60: +d[STOCK_60MA]
            };
        }).sort(function(a, b) {
            return d3.ascending(accessor.d(a), accessor.d(b));
        });

        //console.log(data);
        // x 軸資料
        x.domain(data.map(accessor.d));

        // y 軸資料
        y.domain(techan.scale.plot.ohlc(data, accessor).domain());

        // draw candlestick
        svg.append("g")
            .datum(data)
            .attr("class", "candlestick")
            .call(candlestick);

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
            svg.append("g").attr("class", "sma ma-5");
            svg.select("g.sma.ma-5").datum(techan.indicator.sma().period(2)(data)).call(sma5);
            startMAPos = drawMAIndicator('5MA', startMAPos, '#1f77b4');
        }
        if (options.ma10) {
            svg.append("g").attr("class", "sma ma-10");
            svg.select("g.sma.ma-10").datum(techan.indicator.sma().period(3)(data)).call(sma10);
            startMAPos = drawMAIndicator('10MA', startMAPos, '#aec7e8');
        }
        if (options.ma20) {
            svg.append("g").attr("class", "sma ma-20");
            svg.select("g.sma.ma-20").datum(techan.indicator.sma().period(4)(data)).call(sma20);
            startMAPos = drawMAIndicator('20MA', startMAPos, '#9E9E00');
        }
        if (options.ma60) {
            svg.append("g").attr("class", "sma ma-60");
            svg.select("g.sma.ma-60").datum(techan.indicator.sma().period(5)(data)).call(sma60);
            startMAPos = drawMAIndicator('60MA', startMAPos, '#FF30FF');
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

        // draw crosshair
        svg.append('g')
            .attr("class", "crosshair")
            .datum({ x: x.domain()[80], y: 67.5 })
            .call(crosshair)
            .each(function(d) { move(d); });

        allStockData = data;
    });
}

function move(coords) {
    if (allStockData == undefined)
        return;

    for (let i = 0; i < allStockData.length; i++) {
        if (coords.x == allStockData[i].date) {
            dynamicText[0].svgText.text(timeAnnotation.format()(coords.x));
            dynamicText[1].svgText.text(dynamicText[1].label + ':' + allStockData[i].open);
            dynamicText[2].svgText.text(dynamicText[2].label + ':' + allStockData[i].high);
            dynamicText[3].svgText.text(dynamicText[3].label + ':' + allStockData[i].low);
            dynamicText[4].svgText.text(dynamicText[4].label + ':' + allStockData[i].close);

        }
    }
}
