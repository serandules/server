# use an official node runtime as a parent image
FROM node:10-debug

ARG ENV
ARG GITHUB_USERNAME
ARG GITHUB_PASSWORD

# set the working directory to /srv/www/server
WORKDIR /srv/www/server

# install app dependencies
# a wildcard is used to ensure both package.json AND package-lock.json are copied where available (npm@5+)
COPY package*.json ./

# install logrotate
RUN apt install -y logrotate
COPY .logrotate /etc/logrotate.d/server

# configure logz.io
RUN mkdir -p /etc/pki/tls/certs
RUN wget https://raw.githubusercontent.com/logzio/public-certificates/master/COMODORSADomainValidationSecureServerCA.crt -P /etc/pki/tls/certs

RUN npm install --only=production

# bundle app source
COPY . .

# install services
RUN node install.js

# make port 80 available to the world outside this container
EXPOSE 80

# start server when the container launches
CMD ["npm", "start"]