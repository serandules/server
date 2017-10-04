var log = require('logger')('server:install');
var index = require('./index');

index.install(function (err, modules) {
    if (err) {
        log.error(err);
        throw e;
    }
    log.info('modules were installed successfully');
});