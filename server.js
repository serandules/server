var log = require('logger')('server:server');
var nconf = require('nconf').argv().env();
var fs = require('fs');
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var env = nconf.get('ENV');

nconf.defaults(require('./env/' + env + '.json'));

var server = require('./index');

var certPath = nconf.get('CERT_SERANDIVES');
var pemPath = nconf.get('PEM_SERVER');
var mongourl = nconf.get('MONGODB_URI');

var ca = certPath ? fs.readFileSync(certPath) : null;
var pem = pemPath ? fs.readFileSync(pemPath) : null;

mongoose.connect(mongourl, {
    useMongoClient: true,
    authSource: 'admin',
    ssl: !!pem,
    sslCA: ca,
    sslCert: pem,
    sslKey: pem
});

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

process.on('uncaughtException', function (err) {
    log.debug('uncaughtException ' + err);
    log.debug(err.stack);
    process.exit(1);
});