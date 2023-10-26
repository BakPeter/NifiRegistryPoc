# FROM node:12.4.0-alpine as debug
FROM node:20-alpine as debug

WORKDIR /app/

COPY ./src/package.json /app/package.json
RUN npm install
RUN npm install -g nodemon

COPY ./src/ /app/src/

RUN mkdir ./data
VOLUME [ "/data" ]

ENTRYPOINT [ "nodemon","--inspect=0.0.0.0","./src/server.js" ]

# FROM node:12.4.0-alpine as prod
# FROM node:20-alpine as prod

# WORKDIR /app/
# COPY ./src/package.json /app/package.json
# RUN npm install
# COPY ./src/ /app/

# CMD node .