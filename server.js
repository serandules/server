var log = require('logger')('server:server');
var nconf = require('nconf').argv().env();
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var env = nconf.get('ENV');

nconf.defaults(require('./env/' + env + '.json'));

var server = require('./index');

server.init(function (err) {
    if (err) {
        return log.error(err);
    }
    var mongourl = nconf.get('MONGODB_URI');
    mongoose.connect(mongourl, {useMongoClient: true});
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