var log = require('logger')('server:server');
var nconf = require('nconf').argv().env();
var mongoose = require('mongoose');
var server = require('./index');

mongoose.Promise = global.Promise;

var env = nconf.get('env');

nconf.defaults(require('./env/' + env + '.json'));

server.init(function (err) {
    if (err) {
        return log.error(err);
    }
    var mongourl = nconf.get('mongodbUri');
    mongoose.connect(mongourl);
    var db = mongoose.connection;
    db.on('error', function (err) {
        log.error('mongodb connection error: %e', err);
    });
    db.once('open', function () {
        log.info('connected to mongodb');
        server.start(function (err) {
            if (err) {
                return log.error(err);
            }
        });
    });
});

process.on('uncaughtException', function (err) {
    log.debug('uncaughtException ' + err);
    log.debug(err.stack);
    process.exit(1);
});