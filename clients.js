var log = require('logger')('server:clients');
var util = require('util');
var async = require('async');
var nconf = require('nconf');

var release = require('./.release.json');

var clientPrefix = 'CLIENT_';
var indexPrefix = 'INDEX_';

var findClient = function (envs, env) {
  if (env !== 'CLIENT' && env.indexOf(clientPrefix) !== 0) {
    return null;
  }
  var splits = envs[env].split(':');
  return {
    name: splits[0],
    version: splits[1]
  };
};

var findRelease = function (envs, name, done) {
  var env = indexPrefix + name.toUpperCase();
  var version = envs[env];
  if (version) {
    return done(null, env, version);
  }
  done(null, env, release.version);
};

exports.init = function (done) {
  var envs = nconf.get();
  async.each(Object.keys(envs), function (env, found) {
    var client = findClient(envs, env);
    if (!client) {
      return found();
    }
    if (client.version !== 'master') {
      return found();
    }
    var name = env.substring(clientPrefix.length).toLowerCase();
    findRelease(envs, client.name, function (err, env, version) {
      if (err) {
        return found(err);
      }
      nconf.set(indexPrefix + name.toUpperCase(), version);
      log.info('clients:initialized', 'name:%s version:%s', name, version);
      found();
    });
  }, function (err) {
    if (err) {
      return done(err);
    }
    log.info('clients:initialized');
    done();
  });
};
