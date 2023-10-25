FROM node:alpine

WORKDIR /app
COPY package.json ./
RUN npm install
COPY ./ ./

RUN mkdir ./data
VOLUME [ "/data" ]

CMD ["npm", "start"]