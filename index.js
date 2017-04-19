var log = require('logger')('server');
var shell = require('shelljs');
var nconf = require('nconf');
var async = require('async');
var vhost = require('vhost');
var express = require('express');
var serandi = require('serandi');
var cors = require('cors');

var env = nconf.get('env');

var services = nconf.get('services');

var server;

exports.init = function (done) {
    async.eachLimit(services, 1, function (o, installed) {
        if (env === 'development') {
            return installed();
        }
        if (o.path) {
            return installed();
        }
        shell.exec('npm install ' + 'serandules/' + o.name + '#' + o.version, installed);
    }, done);
};

exports.start = function (done) {
    var domains = {};
    var apps = express();
    services.forEach(function (service) {
        var domain = domains[service.domain] || (domains[service.domain] = []);
        domain.push(service);
    });
    var domainPrefix = (!env || env === 'production') ? '' : env + '.';
    Object.keys(domains).forEach(function (name) {
        var app = express();
        var services = domains[name];
        services.forEach(function (o) {
            var router = express();
            router.use(serandi.locate(o.prefix + '/'));
            var routes;
            try {
                routes = require(o.path || o.name);
            } catch (e) {
                return done(e);
            }
            routes(router);
            app.use(o.prefix, router);
        });
        var domain = (env === 'test') ? 'test' : domainPrefix + o.domain;
        var host = domain + '.serandives.com';
        apps.use(vhost(host, app));
        log.info('host %s was registered', host);
    });
    var port = nconf.get('port');
    server = apps.listen(port, function (err) {
        if (err) {
            return done(err);
        }
        log.info('server started at port %s', port);
        done();
    });
};

exports.stop = function (done) {
    server.close(done);
};