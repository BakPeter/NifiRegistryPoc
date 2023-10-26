'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const settings = {
  serverName: process.env.SERVER_NAME,
  serverPort: process.env.SERVER_PORT,
};

const PORT = 5000;
const HOST = '0.0.0.0';

const app = express();
app.use(bodyParser.json());

app.get('/helth', (req, res) => {
  res.status(200).send({ processConfigurations: settings });
});

app.get('/', (req, res) => {
  res.send('Hello world \n');
});

app.listen(PORT, HOST);

console.log(`Running version 55555 on http://${HOST}:${PORT}`);
