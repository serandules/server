var log = require('logger')('server:server');
var nconf = require('nconf').use('memory').argv().env();
var fs = require('fs');
var mongoose = require('mongoose');

var utils = require('utils');

mongoose.Promise = global.Promise;

var env = utils.env();

nconf.defaults(require('./env/' + env + '.json'));

var server = require('./index');

var mongourl = nconf.get('MONGODB_URI');

var ssl = !!nconf.get('MONGODB_SSL');

mongoose.connect(mongourl, {
    authSource: 'admin',
    ssl: ssl
});

var db = mongoose.connection;

db.on('error', function (err) {
    log.error('mongodb connection error: %e', err);
});

db.once('open', function () {
    log.info('connected to mongodb');
    server.start(function (err) {
        if (err) {
            log.error(err);
            return process.exit(1);
        }
    });
});

process.on('uncaughtException', function (err) {
    log.debug('uncaughtException ' + err);
    log.debug(err.stack);
    process.exit(1);
});