var mysql = require('mysql');
var logger = require('log4js').getLogger('DB');

var pool = mysql.createPool({
    host : 'localhost',
    user : 'stock',
    password : 'stock1688',
    database : 'stock'
});

var connected = false;

var exec = function(sql, values) {
    logger.info('exec: ' + sql);
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
                            resolve({
                                code: 'OK',
                                data: Object.values(JSON.parse(JSON.stringify(rows)))
                            });
                    }
                    connection.release()
                })
            }
        })
    })
}

var addUser = async function(username, email) {
    var sql = "INSERT INTO " 
            + "tracker (" 
            + "tracker_user, tracker_email"
            + ") VALUES ("
            + "'" + username + "', '" + email + "'"
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

module.exports.addUser = addUser;
module.exports.getAllUsers = getAllUsers;
module.exports.getUserByName = getUserByName;
module.exports.updateUserEmail = updateUserEmail;
