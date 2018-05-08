var log = require('logger')('server:install');
var nconf = require('nconf').argv().env();

var utils = require('utils');

var env = utils.env();

nconf.defaults(require('./env/' + env + '.json'));

var server = require('./index');

server.install(function (err, modules) {
    if (err) {
        log.error(err);
        throw e;
    }
    log.info('modules were installed successfully');
});