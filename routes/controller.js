var express = require('express');
var router = express.Router();
var twse = require('../controller/TWSE');

// test GetStock
router.get('/testGetCurrMonth', function(req, res, next) { 
    var stock = twse.getCurrMonth('2454', false);
    res.render('testGetCurrMonth', {
        stock: JSON.stringify(stock, 4)
    });
});

router.get('/testGetHistory', function(req, res, next) { 
    var allStock = '';
    var history = twse.getHistory('2454', false);
    if (history != undefined) {
        history.forEach(function(stock){
            allStock += JSON.stringify(stock, 4);
        });
    }
    res.render('testGetCurrMonth', {
        stock: allStock
    });
});

module.exports = router;
