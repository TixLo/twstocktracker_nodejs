var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var loginRouter = require('./routes/login');
var stockRouter = require('./routes/stock');
var usersRouter = require('./routes/users');
var controllerRouter = require('./routes/controller');

var app = express();

var log4js = require('log4js');

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
