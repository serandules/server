var log = require('logger')('server');
var shell = require('shelljs');
var nconf = require('nconf');
var _ = require('lodash');
var async = require('async');
var vhost = require('vhost');
var express = require('express');
var morgan = require('morgan');
var cors = require('cors');
var compression = require('compression');
var format = require('string-template');
var utils = require('utils');
var util = require('util');
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
      type: 'service',
      name: type + '-' + name,
      version: splits[0],
      subdomain: splits[1],
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
      type: 'local',
      name: type + '-' + name,
      path: splits[0],
      subdomain: splits[1],
      prefix: splits[2]
    });
  }
  return o;
};

var findClients = function () {
  var key;
  var value;
  var splits;
  var subdomain;
  var o = [];
  var type = 'client';
  var prefix = type.toUpperCase();
  var all = nconf.get();

  value = all[prefix];
  if (value) {
    splits = value.split(':');
    o.push({
      type: 'client',
      name: splits[0],
      version: splits[1],
      subdomain: '',
      prefix: '/'
    });
  }
  prefix += '_';
  for (key in all) {
    if (!all.hasOwnProperty(key)) {
      continue;
    }
    if (key.indexOf(prefix) !== 0) {
      continue;
    }
    subdomain = key.substring(prefix.length);
    subdomain = subdomain.toLowerCase().replace('_', '-');
    value = all[key];
    splits = value.split(':');

    o.push({
      type: 'client',
      name: splits[0],
      version: splits[1],
      subdomain: subdomain,
      prefix: '/'
    });
  }
  return o;
};

var servicing = function (module) {
  return module.type === 'local' || module.type === 'service';
};

var subdomain = function (url) {
  url = url.substring(url.indexOf('://') + 3);
  url = url.substring(0, url.indexOf('/'));
  url = url.substring(0, url.lastIndexOf('.'));
  return url.substring(0, url.lastIndexOf('.'));
};

var redirects = function (apps) {
  var from = nconf.get('REDIRECTS');
  if (!from) {
    return;
  }
  from = from.split('|');
  from.forEach(function (host) {
    apps.use(vhost(host, function (req, res) {
      var host = req.get('host');
      res.redirect(301, utils.resolve(subdomain(host) + '://' + req.path));
    }));
  });
};

var server;

var modules = findServices().concat(findLocals()).concat(findClients());

exports.install = function (done) {
  var services = !!nconf.get('SERVICES');
  if (!services) {
    return done();
  }
  async.eachLimit(modules, 1, function (module, installed) {
    if (module.path) {
      return installed();
    }
    var cmd = 'export GITHUB_USERNAME=%s; export GITHUB_PASSWORD=%s; npm install serandules/%s#%s';
    cmd = util.format(cmd, nconf.get('GITHUB_USERNAME'), nconf.get('GITHUB_PASSWORD'), module.name, module.version);
    shell.exec(cmd, function (err) {
      if (err) {
        return installed(err);
      }
      log.info('modules:installed', 'name:%s version:%s', module.version, module.name);
      installed();
    });
  }, done);
};

exports.start = function (done) {
  clients.init(function (err) {
    if (err) {
      return done(err);
    }
    var subdomains = {};
    var apps = express();
    var domain = utils.domain();
    var subdomain = utils.subdomain();

    apps.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms'));
    apps.use(serandi.pond);
    apps.use(throttle.ips());
    redirects(apps);
    apps.use(cors());
    apps.use(compression());
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
      var subdomain = subdomains[module.subdomain] || (subdomains[module.subdomain] = []);
      subdomain.push(module);
    });
    async.eachSeries(Object.keys(subdomains), function (sub, subdomainDone) {
      var app = express();
      var modulez = subdomains[sub];
      async.eachSeries(modulez, function (module, moduleDone) {
        var router = express();
        if (servicing(module)) {
          router.use(serandi.locate(module.prefix + '/'));
        }
        var routes;
        try {
          routes = require(module.path || module.name);
        } catch (e) {
          return done(e);
        }
        routes(router, function (err) {
          if (err) {
            return moduleDone(err);
          }
          app.use(module.prefix, router);
          log.info('modules:registered', 'subdomain:%s name:%s type:%s', sub, module.name, module.type);
          moduleDone();
        });
      }, function (err) {
        if (err) {
          return subdomainDone(err);
        }
        var prefix = sub ? format(subdomain, {subdomain: sub}) + '.' : '';
        var host = prefix + domain;
        apps.use(vhost(host, app));
        log.info('hosts:registered', 'name:%s', host);
        subdomainDone();
      });
    }, function (err) {
      if (err) {
        return done(err);
      }
      apps.use(function (err, req, res, next) {
        if (err.status) {
          return res.pond(err);
        }
        log.error('server-error:errored', err);
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
        log.info('server:started', 'port:%s', port);
        done();
      });
    });
  });
};

exports.stop = function (done) {
  server.close(done);
};
