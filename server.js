var nconf = require('nconf').use('memory').argv().env();
var log = require('logger')('server:server');
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
    log.error('db:errored', err);
});

db.once('open', function () {
    log.info('db:opened');
    server.start(function (err) {
        if (err) {
            log.error('server:errored', err);
            return process.exit(1);
        }
    });
});

process.on('uncaughtException', function (err) {
    log.error('uncaught:threw', err);
    process.exit(1);
});