var logger = require('log4js').getLogger('cookies');
var stockdb = require('../controller/stockdb.js');

var check = async function(cookies) {
    logger.info(cookies);
    if (cookies == undefined)
        return false;

    if (cookies.profile == undefined)
        return false;

    let username = cookies.profile.username;
    if (username == undefined)
        return false;

    var ret = await stockdb.getUserByName(username);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        return false;
    }
    logger.info('cookie is legal');
    return true;
}

var create = function(res, username) {
    let cookieOptions = {
        httpOnly: true,
        maxAge: 5 * 60 * 60 * 1000, // 5 hours
    }
    res.cookie('profile', {
        username: username,
    }, cookieOptions);
}

module.exports.check = check;
module.exports.create = create;;
