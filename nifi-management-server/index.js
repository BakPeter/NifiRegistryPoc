const express = require('express');
const bodyParser = require('body-parser');
const azios = require('axios');

require('dotenv').config();

const settings = {
  serverName: process.env.SERVER_NAME,
  serverPort: process.env.SERVER_PORT,
};

console.log('NifiManagementServer started');

const app = express();
app.use(bodyParser.json());

app.get('/helth', (req, res) => {
  res.status(200).send({ processConfigurations: settings });
});

app.listen(settings.serverPort, () => {
  console.log(
    `${settings.serverName} listenning on port ${settings.serverPort}`
  );
});
