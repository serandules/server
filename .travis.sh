#!/bin/bash

SANDBOX=/tmp/server

CURRENT=`pwd`

echo "current directory ${CURRENT}"

declare -a SERVICES=(`node -p << EOL
(function () {
    var travis = require('./env/travis.json');
    var services = '';
    Object.keys(travis).forEach(function (name) {
        if (name.indexOf('SERVICE_') !== 0) {
            return;
        }
        var service = name.replace('SERVICE_', '').replace('_', '-').toLowerCase();
        var val = travis[name].split(':');
        var branch = val[0];
        services += services ? ' ' + service : service;
    });
    return services;
}());
EOL`)

# backup package.json
mv package.json package.json-backup

mkdir -p $SANDBOX
cd $SANDBOX
echo "sandbox directory ${SANDBOX}"

echo $SERVICES

rm -rf ./*

for SERVICE in "${SERVICES[@]}"
do
    echo "cloning ${SERVICE}"
    git clone https://github.com/serandules/service-${SERVICE}.git
    if [ -d "service-${SERVICE}/test" ]; then
        mkdir -p ${CURRENT}/test/${SERVICE}

        # remove unwanted files
        rm service-${SERVICE}/test/index.js
        rm service-${SERVICE}/test/mocha.js
        rm service-${SERVICE}/test/mocha.opts

        # copy test files
        mv service-${SERVICE}/test/* ${CURRENT}/test/${SERVICE}
        mv service-${SERVICE}/package.json ${CURRENT}

        cd ${CURRENT}
        npm install --only=dev
        cd $SANDBOX
    fi
done

echo "all repos cloned"

cd $CURRENT

mv package.json-backup package.json

