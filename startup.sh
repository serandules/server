#!/bin/bash

# initialize filebeat
echo $LOGZIO_API_TOKEN | filebeat keystore add LOGZIO_API_TOKEN --stdin --force
service filebeat start || true

# start server
node server.js >> /var/log/server.log 2>&1
