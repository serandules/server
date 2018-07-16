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

RUN npm install --only=production

# bundle app source
COPY . .

# install services
RUN node install.js

# make port 80 available to the world outside this container
EXPOSE 80

# start server when the container launches
CMD ["npm", "start"]