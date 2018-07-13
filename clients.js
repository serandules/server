var log = require('logger')('server:clients');
var util = require('util');
var async = require('async');
var fs = require('fs');
var nconf = require('nconf');

var Releases = require('model-releases');

var clientPrefix = 'CLIENT_';
var indexPrefix = 'INDEX_';

var find = function (envs, name, done) {
  var env = indexPrefix + name.toUpperCase();
  var version = envs[env];
  if (version) {
    return done(null, env, version);
  }
  Releases.findOne({
    type: 'serandomps',
    name: name
  }).sort({_id: -1}).exec(function (err, release) {
    if (err) {
      return done(err);
    }
    if (!release) {
      return done(new Error(util.format('cannot find a release for client: %s', name)));
    }
    done(null, env, release.version);
  });
};

exports.init = function (done) {
  var envs = nconf.get();
  async.each(Object.keys(envs), function (env, found) {
    if (env.indexOf(clientPrefix) !== 0) {
      return found();
    }
    var version = envs[env];
    if (version !== 'master') {
      return found();
    }
    var name = env.substring(clientPrefix.length).toLowerCase();
    find(envs, name, function (err, env, version) {
      if (err) {
        return found(err);
      }
      nconf.set(env, version);
      log.info('using %s version %s', name, version);
      found();
    });
  }, function (err) {
    if (err) {
      return done(err);
    }
    log.info('all clients initialized');
    done();
  });
};