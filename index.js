var log = require('logger')('server');
var shell = require('shelljs');
var nconf = require('nconf');
var _ = require('lodash');
var async = require('async');
var vhost = require('vhost');
var express = require('express');
var compression = require('compression');
var cors = require('cors');
var format = require('string-template');
var utils = require('utils');
var serandi = require('serandi');
var throttle = require('throttle');
var errors = require('errors');
var clients = require('./clients');

var env = utils.env();

var findServices = function () {
  var key;
  var name;
  var o = [];
  var type = 'service';
  var prefix = type.toUpperCase() + '_';
  var all = nconf.get();
  for (key in all) {
    if (!all.hasOwnProperty(key)) {
      continue;
    }
    if (key.indexOf(prefix) !== 0) {
      continue;
    }
    name = key.substring(prefix.length);
    name = name.toLowerCase().replace('_', '-');
    var value = all[key];
    var splits = value.split(':');
    o.push({
      name: type + '-' + name,
      version: splits[0],
      domain: splits[1],
      prefix: splits[2]
    });
  }
  return o;
};

var findLocals = function () {
  var key;
  var name;
  var o = [];
  var type = 'local';
  var prefix = type.toUpperCase() + '_';
  var all = nconf.get();
  for (key in all) {
    if (!all.hasOwnProperty(key)) {
      continue;
    }
    if (key.indexOf(prefix) !== 0) {
      continue;
    }
    name = key.substring(prefix.length);
    name = name.toLowerCase().replace('_', '-');
    var value = all[key];
    var splits = value.split(':');
    o.push({
      name: type + '-' + name,
      path: splits[0],
      domain: splits[1],
      prefix: splits[2]
    });
  }
  return o;
};

var findClients = function () {
  var key;
  var name;
  var o = [];
  var type = 'client';
  var prefix = type.toUpperCase() + '_';
  var all = nconf.get();
  for (key in all) {
    if (!all.hasOwnProperty(key)) {
      continue;
    }
    if (key.indexOf(prefix) !== 0) {
      continue;
    }
    name = key.substring(prefix.length);
    name = name.toLowerCase().replace('_', '-');
    var value = all[key];
    o.push({
      name: name,
      version: value,
      domain: name,
      prefix: '/'
    });
  }
  return o;
};

var server;

var modules = findServices().concat(findLocals()).concat(findClients());

exports.install = function (done) {
  var services = !!nconf.get('SERVICES');
  async.eachLimit(modules, 1, function (module, installed) {
    if (!services) {
      return installed();
    }
    if (module.path) {
      return installed();
    }
    shell.exec('npm install ' + 'serandules/' + module.name + '#' + module.version, installed);
  }, done);
};

exports.start = function (done) {
  clients.init(function (err) {
    if (err) {
      return done(err);
    }
    var domains = {};
    var apps = express();
    var serverHost = nconf.get('SERVER_HOST');
    apps.use(serandi.pond);
    apps.use(throttle.ips());
    apps.use(compression());
    apps.use(cors());
    apps.get('/status', function (req, res) {
      res.json({
        status: 'healthy'
      });
    });
    if (nconf.get('SERVER_TRUST_PROXY')) {
      apps.enable('trust proxy');
    }
    if (nconf.get('SERVER_SSL')) {
      apps.use(serandi.ssl);
    }
    modules.forEach(function (module) {
      var domain = domains[module.domain] || (domains[module.domain] = []);
      domain.push(module);
    });
    var i;
    var module;
    var name;
    var app;
    var modulez;
    var router;
    var domain;
    var host;
    for (name in domains) {
      if (!domains.hasOwnProperty(name)) {
        continue;
      }
      app = express();
      modulez = domains[name];
      for (i = 0; i < modulez.length; i++) {
        module = modulez[i];
        router = express();
        router.use(serandi.locate(module.prefix + '/'));
        var routes;
        try {
          routes = require(module.path || module.name);
        } catch (e) {
          console.error(e);
          return done(e);
        }
        routes(router);
        app.use(module.prefix, router);
        log.info('registering service %s under %s', module.name, name);
      }
      host = format(serverHost, {sub: name});
      apps.use(vhost(host, app));
      log.info('registered host %s', host);
    }
    apps.use(function (err, req, res, next) {
      if (err.status) {
        return res.pond(errors.badRequest());
      }
      log.error(err);
      res.pond(errors.serverError());
    });
    apps.use(function (req, res, next) {
      res.pond(errors.notFound());
    });
    var port = nconf.get('PORT');
    server = apps.listen(port, function (err) {
      if (err) {
        return done(err);
      }
      log.info('started server at port %s', port);
      done();
    });
  });
};

exports.stop = function (done) {
  server.close(done);
};