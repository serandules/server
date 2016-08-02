var log = require('logger')('server');
var nconf = require('nconf').argv().env();
var async = require('async');
var vhost = require('vhost');
var mongoose = require('mongoose');
var express = require('express');

var mongourl = nconf.get('MONGODB_URI');

var app = express();

mongoose.connect(mongourl);

var domains = ['accounts', 'autos'];

var envs = require('./package.json').environments;

Object.keys(envs).forEach(function (name) {
    nconf.set(name, envs[name]);
});

var db = mongoose.connection;
db.on('error', function (err) {
    log.error(err);
});
db.once('open', function () {
    log.info('connected to mongodb');

    var jobs = [];
    domains.forEach(function (domain) {
        jobs.push(function (done) {
            var app = require(domain);
            app(function (err, app) {
                if (err) {
                    return done(err);
                }
                done(null, {domain: domain, app: app});
            });
        });
    });
    async.parallel(jobs, function (err, o) {
        if (err) {
            throw err;
        }
        o.forEach(function (o) {
            var host = o.domain + '.serandives.com';
            app.use(vhost(host, o.app));
            log.info('host %s was registered', host);
        });
        app.listen(nconf.get('PORT'));
    });
});

process.on('uncaughtException', function (err) {
    log.debug('unhandled exception ' + err);
    log.debug(err.stack);
    process.exit(1);
});