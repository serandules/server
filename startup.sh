#!/bin/bash

# initialize filebeat
echo $LOGZIO_API_TOKEN | filebeat keystore add LOGZIO_API_TOKEN --stdin --force
service filebeat start

# start server
npm start