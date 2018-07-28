#!/bin/bash

SANDBOX=/tmp/server

CURRENT=`pwd`

echo $CURRENT

declare -a SERVICES=(`node -c << EOL
var dev = require('./env/development.json');
var services = '';
Object.keys(dev).forEach(function (name) {
    if (name.indexOf('SERVICE_') !== 0) {
        return;
    }
    var service = name.replace('SERVICE_', '').replace('_', '-').toLowerCase();
    var val = dev[name].split(':');
    var branch = val[0];
    services += services ? ' ' + service : service;
});
console.log(services);
EOL`)

mkdir -p $SANDBOX
cd $SANDBOX
rm -rf ./*

for SERVICE in "${SERVICES[@]}"
do
    git clone https://github.com/serandules/service-${SERVICE}.git
    if [ -d "service-${SERVICE}/test" ]; then
        mkdir -p ${CURRENT}/test/${SERVICE}
        mv service-${SERVICE}/test/* ${CURRENT}/test/${SERVICE}
    fi
done

cd $CURRENT

