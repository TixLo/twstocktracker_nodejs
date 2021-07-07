var createError = require('http-errors');
var express = require('express');
var cron = require('node-cron');
var path = require('path');
var cookieParser = require('cookie-parser');
var shell = require('shelljs');

var loginRouter = require('./routes/login');
var stockRouter = require('./routes/stock');
var usersRouter = require('./routes/users');
var controllerRouter = require('./routes/controller');
var TWSE = require('./controller/TWSE.js');
var TWSEFetch = require('./controller/TWSEFetch.js');

var app = express();

var log4js = require('log4js');
var pm2 = require('pm2');

//setup log4js
var logConfigPath = './config/log4js.json';
let logConfig = require(logConfigPath);
log4js.configure(logConfig);
var logger = log4js.getLogger();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('view cache');

app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', loginRouter);
app.use('/stock', stockRouter);
app.use('/users', usersRouter);
app.use('/controller', controllerRouter);

cron.schedule('59 23 * * *', function() {
    //
    // backup DB everyday
    //
    let t = new Date();
    logger.info('backup mysql database...');
    let backupFile = t.getFullYear().toString() + (t.getMonth() + 1).toString() + t.getDate();
    let command = 'mysqldump -u root -p17quajzm stock > ../mysqlBackup/' + backupFile + '_stock.sql';
    logger.info(command);
    if (shell.exec(command).code !== 0) {
        shell.exit(1);
    }
    else {
        shell.echo('Database backup complete');
    }
});

cron.schedule('0 15 * * *', function() {
    logger.info('call TWSE.updateCurrMonth()');
    TWSEFetch.resetTodayRTStocks();
    TWSE.updateCurrMonth();
});

cron.schedule('*/30 * 9-14 * * 1-5', function() {
    TWSEFetch.fetchRealTimeStockPrice();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
