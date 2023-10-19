const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const settings = require('./app-settings.json');

console.log(`settings: ${JSON.stringify(settings)}`);

const app = express();
app.use(bodyParser.json());

// rnd
// ===========================================================================================
// ===========================================================================================
app.get('/rnd/about', async (req, res) => {
  //   axios
  //     .get('http://localhost:18080/nifi-registry-api/about')
  //     .then((res) => {})
  //     .catch((error) => {});

  try {
    const response = await axios.get(
      'http://localhost:18080/nifi-registry-api/about'
    );
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/rnd/buckets', async (req, res) => {
  try {
    const response = await axios.get(
      'http://localhost:18080/nifi-registry-api/buckets'
    );
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/rnd/buckets', async (req, res) => {
  try {
    const { description, name } = req.body;

    const response = await axios.post(
      'http://localhost:18080/nifi-registry-api/buckets',
      { description, name }
    );
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/rnd/export/:flowId', (req, res) => {
  const flowId = req.params.flowId;
  const { version } = req.body;
  const reqData = { flowId, version };

  console.log(`${JSON.stringify(reqData)}`);

  res.status(200).send({ reqData });
});

// ===========================================================================================
// ===========================================================================================

app.listen(settings.port, () => {
  console.log(`Listening on port ${settings.port}`);
});
