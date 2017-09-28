var log = require('logger')('server');
var shell = require('shelljs');
var nconf = require('nconf');
var async = require('async');
var vhost = require('vhost');
var express = require('express');
var serandi = require('serandi');
var errors = require('errors');
var cors = require('cors');

var env = nconf.get('env');

var services = nconf.get('services');

var server;

exports.init = function (done) {
    async.eachLimit(services, 1, function (o, installed) {
        if (env === 'development' || env === 'test') {
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
    apps.use(serandi.pond);
    apps.use(cors());
    services.forEach(function (service) {
        var domain = domains[service.domain] || (domains[service.domain] = []);
        domain.push(service);
    });
    var domainPrefix = (!env || env === 'production') ? '' : env + '.';
    var i;
    var service;
    var name;
    var app;
    var servicez
    for (name in domains) {
        if (!domains.hasOwnProperty(name)) {
            continue;
        }
        app = express();
        servicez = domains[name];
        for (i = 0; i < servicez.length; i++) {
            service = servicez[i];
            var router = express();
            router.use(serandi.locate(service.prefix + '/'));
            var routes;
            try {
                routes = require(service.path || service.name);
            } catch (e) {
                return done(e);
            }
            routes(router);
            app.use(service.prefix, router);
        }
        var domain = (env === 'test') ? 'test' : domainPrefix + name;
        var host = domain + '.serandives.com';
        apps.use(vhost(host, app));
        log.info('host %s was registered', host);
    }
    apps.use(function (err, req, res, next) {
        if (err.status) {
            return res.pond(errors.badRequest())
        }
        console.error(err);
        log.error(err);
        res.pond(errors.serverError());
    });
    apps.use(function (req, res, next) {
        res.pond(errors.notFound());
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