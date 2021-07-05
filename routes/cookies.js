var logger = require('log4js').getLogger('cookies');
var stockdb = require('../controller/stockdb.js');

var check = async function(cookies) {
    //logger.info(cookies);
    if (cookies == undefined)
        return false;

    if (cookies.profile == undefined)
        return false;

    let username = cookies.profile.username;
    if (username == undefined)
        return false;

    if (username == 'ADMIN')
        return true;

    var ret = await stockdb.getUserByName(username);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        return false;
    }
    //logger.info('cookie is legal');
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

var getUsername = async function(cookies) {
    //logger.info(cookies);
    if (cookies == undefined)
        return undefined;

    if (cookies.profile == undefined)
        return undefined;

    let username = cookies.profile.username;
    //logger.info('username: ' + username);
    if (username == undefined)
        return undefined;

    var ret = await stockdb.getUserByName(username);
    if (ret.code == 'ERROR' || ret.data == undefined) {
        return undefined;
    }

    if (username.split('-').length < 2)
        return username;
    //logger.info('real username:' + username.split('-')[1]);
    return username.split('-')[1];
}

module.exports.check = check;
module.exports.create = create;;
module.exports.getUsername = getUsername;;
