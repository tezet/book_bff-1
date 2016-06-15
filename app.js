var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var esiMiddleware = require('nodesi').middleware;

var routes = require('./routes/index');
var users = require('./routes/users');
var goodGuy = require('good-guy-http')({maxRetries: 3});
var jp = require('jsonpath');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(esiMiddleware({
    onError: function(src, error) {
        return '<!-- GET ' + src + ' resulted in ' + error + '-->'
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/book/:isbn', function (req, res, next) {
    var correlationId = req.headers['x-request-id'] || Math.random();

    req.esiOptions = {
        headers: {
            'Accept': 'text/html',
            'X-Request-ID': correlationId
        }
    };

    goodGuy('https://book-catalog-proxy.herokuapp.com/book?isbn=' + req.params.isbn).then(function (response) {
        var body = JSON.parse(response.body);

        var title = jp.value(body, '$..title');
        var cover = jp.value(body, '$..thumbnail');

        var availabilityUrl = (process.env.INVENTORY_SERVICE || 'https://book-inventory-us-prod.herokuapp.com/stock/')+req.params.isbn;

        res.render('book', {partials: {layout: 'layout_file'}, title: title, cover: cover, availabilityUrl: availabilityUrl, correlationId: correlationId});
    }).catch(next);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
