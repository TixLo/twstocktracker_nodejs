var mysql = require('mysql');
var logger = require('log4js').getLogger('DB');
var format = require('string-format');

format.extend(String.prototype, {})

var pool = mysql.createPool({
    host : 'localhost',
    user : 'stock',
    password : 'stock1688',
    database : 'stock'
});

var connected = false;

var exec = function(sql, values) {
    //logger.info('exec: ' + sql);
    return new Promise(( resolve, reject ) => {
        pool.getConnection(function(err, connection) {
            if (err) {
                reject( err )
            } else {
                connection.query(sql, values, ( err, rows) => {
                    if ( err ) {
                        reject({code: 'ERROR'})
                    } else {
                        if (rows.length == 0)
                            resolve({code: 'OK'});
                        else
                            var data = Object.values(JSON.parse(JSON.stringify(rows)));
                            if (data != undefined) {
                                if (data.length == 1) {
                                    for (const [key, value] of Object.entries(data[0])) {
                                        if (key.indexOf('COUNT(') >= 0) {
                                            delete data[0][key];
                                            data[0]['COUNT'] = value;
                                        }
                                        break;
                                    }
                                }
                            }
                            
                            resolve({code: 'OK', data: data});
                    }
                    connection.release()
                })
            }
        })
    })
}

var dateToLong = function(dateString) {
    try {
        let token = dateString.split('/');
        if (token.length != 3)
            return 0;
        let yyyy = parseInt(token[0]) + 1911;
        let mm = parseInt(token[1]);
        let dd = parseInt(token[2]);
        let d = new Date(yyyy, mm, dd);
        return d.getTime();
    }
    catch (err) {
        return 0;
    }
}

var currencyToLong = function(currency) {
    try {
        var number = Number(currency.replace(/[^0-9\.]+/g,""));
        return number;
    }
    catch (err) {
        return 0;
    }
}

var priceToFloat = function(price) {
    try {
        price = price.replace('X','');
        price = price.replace(',','');
        return parseFloat(price);
    }
    catch (err) {
        return 0.0;
    }
}

var addUser = async function(username, password, email) {
    var sql = "INSERT INTO " 
            + "tracker (" 
            + "tracker_user, tracker_passwd, tracker_email"
            + ") VALUES ("
            + "'" + username + "', '" + password + "', ' " + email + "'"
            + ")";
    return await exec(sql);
}

var removeUserStock = async function(user) {
    // remove
    let sql = "DELETE FROM tracker_stock WHERE tracker_id={0}".format(user.tracker_id);
    await exec(sql);
}

var addUserStock = async function(user, stock) {
    // add
    sql = "INSERT INTO " 
            + "tracker_stock (" 
            + "tracker_id, stock_id"
            + ") VALUES ("
            + "'" + user.tracker_id + "', '" + stock.stock_id + "'"
            + ")";
    return await exec(sql);
}

var getAllUsers = async function() {
    var sql = 'SELECT * from tracker';
    return await exec(sql);
}

var getUserByName = async function(name) {
    var sql = 'SELECT * FROM tracker WHERE tracker_user="' + name + '"';
    return await exec(sql);
}

var updateUserEmail = async function(user, newEmail) {
    var sql = 'UPDATE tracker SET tracker_email="' + newEmail + '" WHERE tracker_user="' + user.tracker_user + '";';
    return await exec(sql);
}

var getUserStocks = async function(user) {
    let sql = "SELECT * FROM tracker_stock WHERE tracker_id={0}".format(user.tracker_id);
    let allStockIds = await exec(sql);
    //logger.info(allStockIds);

    let allStocks = [];
    if (allStockIds.data == undefined)
        return allStockIds;

    for (let i=0 ; i<allStockIds.data.length ; i++) {
        sql = "SELECT * FROM stock WHERE stock_id={0}".format(allStockIds.data[i].stock_id);
        let d1 = await exec(sql);
        if (d1.data == undefined)
            continue;

        let d2 = await getAllStockDay(d1.data[0].stock_id);
        if (d2.data == undefined)
            continue;

        let stock = d1.data[0];
        stock.data = d2.data;
        allStocks.push(stock);
    }

    return allStocks;
}

var getStockDay = async function(stockId, date) {
    let dateLong = dateToLong(date);
    let sql = "SELECT * FROM `stock_day` WHERE date_stock={0} and stock_id='{1}'";
    sql = sql.format(dateLong, stockId);
    return await exec(sql);
}

var getAllStockDay = async function(stockId) {
    let sql = "SELECT * FROM `stock_day` WHERE stock_id={0}".format(stockId);
    return await exec(sql);
}

var getStockDayByPeriod = async function(stockNo, startDate, endDate) {
    let d = await getStock([stockNo]);
    if (d.data == undefined)
        return undefined;

    let sql = '';
    if (startDate == undefined) {
        sql = "SELECT * FROM `stock_day` WHERE stock_id={0}";
        sql = sql.format(d.data[0].stock_id);
    }
    else {
        sql = "SELECT * FROM `stock_day` WHERE stock_id={0} and date_stock>={1} and date_stock<={2}";
        sql = sql.format(d.data[0].stock_id, dateToLong(startDate), dateToLong(endDate));
    }
    return await exec(sql);
}

var getStock = async function(stockNos) {
    // SELECT * FROM `stock` WHERE (stock_no='2454') OR (stock_no='0050')
    //let sql = "SELECT * FROM `stock` WHERE stock_no='{0}'";
    let sql = "SELECT * FROM `stock` WHERE ";
    for (let i = 0 ; i<stockNos.length ; i++) {
        sql += "(stock_no='" + stockNos[i] + "')";

        if (i != stockNos.length - 1)
            sql += " OR ";
    }
    return await exec(sql);
}

var getAllStock = async function() {
    let sql = "SELECT * FROM `stock` WHERE 1";
    return await exec(sql);
}

var getStockCountByDbId = async function(stockDbId) {
    let sql = "SELECT COUNT(*) FROM stock_day WHERE stock_id='{0}'";
    sql = sql.format(stockDbId);
    return await exec(sql);
}

var delStock = async function(stockNo) {
    let stock = await getStock([stockNo]);
    if (stock.data == undefined)
        return;

    logger.info('delStock: ' + stockNo);
    //logger.info(stock);

    // remove stock data
    let sql = "DELETE FROM stock WHERE stock_id={0}";
    sql = sql.format(stock.data[0].stock_id);
    await exec(sql);

    // rmove all stock_day data
    sql = "DELETE FROM stock_day WHERE stock_id={0}";
    sql = sql.format(stock.data[0].stock_id);

    return await exec(sql);
}

var delAllStockDay = async function() {
    // rmove all stock_day data
    let sql = "DELETE FROM stock_day WHERE 1";
    return await exec(sql);
}

var querySavedStock = async function(stockId) {
    let sql = "SELECT * FROM stock WHERE stock_no='{0}'";
    sql = sql.format(stockId);
    return await exec(sql);
}

var addStock = async function(stockJson, type) {
    //logger.info(stockJson);
    let stockId = stockJson.stockId;
    let stockName = stockJson.name;
    let typeDesc = '';
    if (type == 'TYPE1')
        typeDesc = '上市';

    //
    // save or update stock table
    //
    var stock = await getStock([stockId]);
    //logger.info(stock);
    if (stock.code != 'OK' || stock.data == undefined) {
        // logger.info('insert into DB');
        // add
        let sql = "INSERT INTO " 
                + "stock (stock_name, stock_no, stock_type) VALUES ('{0}', '{1}', '{2}')";
        try {
            sql = sql.format(stockName, stockId, typeDesc);
            await exec(sql);
        }
        catch (err) {
            logger.info('failed to insert stock table');
            logger.info(err);
            return;
        }
    }
    stock = await getStock([stockId]);
    //logger.info(stock);

    // save or update stock_day table
    for (let i=0 ; i<stockJson.data.length ; i++) {
        let item = stockJson.data[i];
        //logger.info(item)
        //check data
        let ok = true;
        for (let j=0 ; j<item.length ; j++) {
            if (item[j] == '--') {
                ok = false;
                break;
            }
        }
        if (ok == false)
            continue;

        let data = {
            stockDateStr : item[0],
            stockDate : dateToLong(item[0]),
            stockDealNum : currencyToLong(item[1]),
            stockDealPrice : currencyToLong(item[2]),
            stockOpenPrice : priceToFloat(item[3]),
            stockHighestPrice : priceToFloat(item[4]),
            stockLowestPrice : priceToFloat(item[5]),
            stockClosePrice : priceToFloat(item[6]),
            stockDeltaPrice : priceToFloat(item[7]),
            stockNum : currencyToLong(item[8]),
            stockId : stockId,
            stockDbId : stock.data[0].stock_id
        };
        //logger.info(data);
        let sql = '';

        //
        // check existed or not
        //
        let stockDay = await getStockDay(data.stockDbId, item[0]);
        if (stockDay.code != 'OK' || stockDay.data == undefined) {
            //logger.info('insert {stockId} , {stockDateStr}'.format(data));
            // add
            sql = "INSERT INTO " 
                    + "stock_day (" 
                    + "date_stock,"
                    + "stock_close_price,"
                    + "stock_cost,"
                    + "stock_deal_num,"
                    + "stock_delta_price,"
                    + "stock_highest_price,"
                    + "stock_id,"
                    + "stock_lowest_price,"
                    + "stock_num,"
                    + "stock_open_price"
                    + ") VALUES ("
                    + "{stockDate},"
                    + "{stockClosePrice},"
                    + "{stockDealPrice},"
                    + "{stockDealNum},"
                    + "{stockDeltaPrice},"
                    + "{stockHighestPrice},"
                    + "{stockDbId},"
                    + "{stockLowestPrice},"
                    + "{stockNum},"
                    + "{stockOpenPrice}"
                    + ")";
            try {
                sql = sql.format(data);
            }
            catch (err) {
                logger.info('failed to insert stock_day');
                logger.info(sql);
                logger.info(err);
                continue;
            }

            //logger.info(sql);
            await exec(sql);
        }
    }

    return;
}

var delUsers = async function(users){
    for (let i=0 ; i<users.length ; i++) {
        // 1. query user data from db
        let user = await getUserByName(users[i]);
        if (user.data == undefined)
            continue;

        // 2. remove user's all stocks
        await removeUserStock(user.data[0]);

        // 3. remove user
        let sql = "DELETE FROM tracker WHERE tracker_id={0}".format(user.data[0].tracker_id);
        await exec(sql);
    }
}

var addAlgoSettings = async function(user, settings) {
    let sql = "INSERT INTO " 
            + "algo (" 
            + "tracker_id, settings"
            + ") VALUES ("
            + "'" + user.tracker_id + "', '" + settings + "'"
            + ")";
    return await exec(sql);
}

var updateAlgoSettings = async function(algo, settings) {
    let sql = "UPDATE algo SET settings='" + settings + "' WHERE algo_id=" + algo.algo_id + ";"; 
    return await exec(sql);
}

var getAlgoSettings = async function(user) {
    let sql = 'SELECT * FROM algo WHERE tracker_id="' + user.tracker_id + '"';
    return await exec(sql);
}

var getAlgoSettingsByUserName = async function(userName) {
    let user = await getUserByName(userName);
    if (user.data == undefined)
        return undefined;
    user = user.data[0];

    let sql = 'SELECT * FROM algo WHERE tracker_id="' + user.tracker_id + '"';
    return await exec(sql);
}

module.exports.addUser = addUser;
module.exports.getAllUsers = getAllUsers;
module.exports.getUserByName = getUserByName;
module.exports.updateUserEmail = updateUserEmail;
module.exports.addStock = addStock;
module.exports.getStockDay = getStockDay;
module.exports.getAllStockDay = getAllStockDay;
module.exports.getStockDayByPeriod = getStockDayByPeriod;
module.exports.getStock = getStock;
module.exports.getAllStock = getAllStock;
module.exports.getStockCountByDbId = getStockCountByDbId;
module.exports.querySavedStock = querySavedStock;
module.exports.delStock = delStock;
module.exports.delAllStockDay = delAllStockDay;
module.exports.addUserStock = addUserStock;
module.exports.removeUserStock = removeUserStock;
module.exports.getUserStocks = getUserStocks;
module.exports.delUsers = delUsers;
module.exports.addAlgoSettings = addAlgoSettings;
module.exports.getAlgoSettings = getAlgoSettings;
module.exports.getAlgoSettingsByUserName = getAlgoSettingsByUserName;
module.exports.updateAlgoSettings = updateAlgoSettings;
