var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
require('dotenv').config();

var indexRouter = require('./routes/index');
var orderRouter = require('./routes/order');
var userRouter = require('./routes/user');
var articleRouter = require('./routes/article');
var masterRouter = require('./routes/master');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const corsOptions = {
  origin: 'https://shop.brokoly.de',
};

app.use(cors(corsOptions));

/*
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://shop.brokoly.de');
  //res.header('Access-Control-Allow-Origin', 'http://localhost');
  //res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});
*/

app.use('/api/', indexRouter);
app.use('/api/order', orderRouter);
app.use('/api/user', userRouter);
app.use('/api/article', articleRouter);
app.use('/api/master', masterRouter);

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
