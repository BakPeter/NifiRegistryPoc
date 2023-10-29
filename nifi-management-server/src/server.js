'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');

const settings = {
  serverName: process.env.SERVER_NAME,
  serverPort: process.env.SERVER_PORT,
  serverHost: process.env.SERVER_HOST || '0.0.0.0',
  nifiHost: process.env.NIFI_HOST,
  nifiRegistryHost: process.env.NIFI_REGISTRY_HOST,
};

const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  console.log(
    `GET /health ${JSON.stringify({ params: req.params, body: req.body })}`
  );
  res.status(200).send({ state: 'Healthy', processConfigurations: settings });
});

// nifi

// nifi-registry
// /registry/...
app.get('/registry/buckets', async (req, res) => {
  console.log(
    `GET - /registry/buckets ${JSON.stringify({
      params: req.params,
      body: req.body,
    })}`
  );
  try {
    const response = await getBucketsAsync();
    res.status(200).send(response);
  } catch (error) {
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send(error);
  }
});

app.post('/registry/buckets', async (req, res) => {
  console.log(
    `POST - /registry/buckets ${JSON.stringify({
      params: req.params,
      body: req.body,
    })}`
  );
  try {
    const response = await axios.post(
      `${settings.nifiRegistryHost}/nifi-registry-api/buckets`,
      { ...req.body }
    );
    res.status(201).send(response.data);
  } catch (error) {
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send(error);
  }
});

app.post('/registry/buckets/:bucketName/flows', async (req, res) => {
  console.log(
    `POST /registry/buckets/:bucketName/flows ${JSON.stringify({
      params: req.params,
      body: req.body,
    })}`
  );
  try {
    const bucketId = await getBucketId(req.params.bucketName);
    if (!bucketId) {
      res.status(400).send({
        response: { message: 'no bucket with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const response = await axios.post(
      `${settings.nifiRegistryHost}/nifi-registry-api/buckets/${bucketId}/flows`,
      { name: req.body.flowName }
    );
    res.status(201).send({ ...response.data });
  } catch (error) {
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send(error.message);
  }
});

app.get(
  '/registry/buckets/:bucketName/flows/:flowName/versions/:versionNumber/export',
  async (req, res) => {
    console.log(
      `GET /registry/buckets/:bucketName/flows/:flowName/versions/:versionNumber/export ${JSON.stringify(
        { params: req.params, body: req.body }
      )}`
    );
    try {
      const response = await getFlowVersion(
        req.params.bucketName,
        req.params.flowName,
        req.params.versionNumber
      );

      res
        .status(response.status)
        .send(
          response.status === 200
            ? response.body
            : { ...response.body, requestParams: req.params }
        );
    } catch (error) {
      error.response
        ? res.status(error.response.status).send(error.response.data)
        : res.status(500).send(error);
    }
  }
);

app.post(
  '/registry/buckets/:bucketName/flows/:flowName/versions/:versionNumber/export',
  async (req, res) => {
    console.log(
      `POST /registry/buckets/:bucketName/flows/:flowName/versions/:versionNumber/export ${JSON.stringify(
        { params: req.params, body: req.body }
      )}`
    );
    try {
      const response = await getFlowVersion(
        req.params.bucketName,
        req.params.flowName,
        req.params.versionNumber
      );

      if (response.status === 200) {
        const fileData = JSON.stringify(response.body);
        let filePath = req.body.fileName || 'flowFile';
        filePath = `${filePath}-${req.params.bucketName}-${req.params.flowName}-${req.params.versionNumber}.json`;
        filePath = `/app/data/${filePath}`;

        try {
          fs.writeFileSync(filePath, fileData);
        } catch (error) {
          const x = 1;
        }

        res.status(201).send(filePath);
      } else {
        res.status(500).send({
          requestParams: req.params,
          requestBody: req.body,
          result: response,
        });
      }
    } catch (error) {
      error.response
        ? res.status(error.response.status).send(error.response.data)
        : res.status(500).send(error);
    }
  }
);

app.post(
  '/registry/buckets/:bucketName/flows/:flowName/verions/import',
  async (req, res) => {
    console.log(
      `POST /registry/buckets/:bucketName/flows/:flowName/verions/import ${JSON.stringify(
        {
          params: req.params,
          body: req.body,
        }
      )}`
    );

    try {
      const bucketId = await getBucketId(req.params.bucketName);
      if (!bucketId) {
        res.status(400).send({
          response: { message: 'no bucket with the given name' },
          params: req.params,
          body: req.body,
        });
        return;
      }

      const flowId = await getFlowId(bucketId, req.params.flowName);
      if (!flowId) {
        res.status(400).send({
          response: { message: 'no flow with the given name' },
          params: req.params,
          body: req.body,
        });
        return;
      }

      const flow = require(`/app/data/${req.body.versionFile}`);

      const response = await axios.post(
        `${settings.nifiRegistryHost}/nifi-registry-api/buckets/${bucketId}/flows/${flowId}/versions`,
        { ...flow }
      );

      res.status(response.status).send({ ...response.data });
    } catch (error) {
      error.response
        ? res.status(error.response.status).send(error.response.data)
        : res.status(500).send(error.message);
    }
  }
);

// nifi
// /nifi/...
app.post('/nifi/processgroups', async (req, res) => {
  console.log(
    `POST /nifi/processgroups ${JSON.stringify({
      params: req.params,
      body: req.body,
    })}`
  );

  try {
    const bucketId = await getBucketId(req.body.bucketName);
    if (!bucketId) {
      res.status(400).send({
        response: { message: 'no bucket with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const flowId = await getFlowId(bucketId, req.body.flowName);
    if (!flowId) {
      res.status(400).send({
        response: { message: 'no flow with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const registryId = await getReistryId(req.body.registryName);
    if (!registryId) {
      res.status(400).send({
        response: { message: 'no registry with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const rootGroupId = await getRootGroupId();
    if (!rootGroupId) {
      res.status(400).send({
        response: { message: 'falied to fetch root group id' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const response = await axios.post(
      `${settings.nifiHost}/nifi-api/process-groups/${rootGroupId}/process-groups`,
      {
        revision: {
          version: 0,
        },
        component: {
          position: {
            x: 0.0,
            y: 0.0,
          },
          versionControlInformation: {
            registryId,
            bucketId,
            flowId,
            version: req.body.version,
          },
        },
      }
    );

    res.status(200).send({ ...response.data });
  } catch (error) {
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send(error.message);
  }
});

app.post('/nifi/processgroups/version', async (req, res) => {
  console.log(
    `POST /nifi/processgroups/version ${JSON.stringify({
      params: req.params,
      body: req.body,
    })}`
  );

  try {
    const bucketId = await getBucketId(req.body.bucketName);
    if (!bucketId) {
      res.status(400).send({
        response: { message: 'no bucket with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const flowId = await getFlowId(bucketId, req.body.flowName);
    if (!flowId) {
      res.status(400).send({
        response: { message: 'no flow with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const registryId = await getReistryId(req.body.registryName);
    if (!registryId) {
      res.status(400).send({
        response: { message: 'no registry with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const groupData = await getGroupData(req.body.groupName);
    if (!groupData) {
      res.status(400).send({
        response: { message: 'no group with the given name' },
        params: req.params,
        body: req.body,
      });
      return;
    }

    const response = await axios.post(
      `${settings.nifiHost}/nifi-api/versions/update-requests/process-groups/${groupData.id}`,
      {
        processGroupRevision: { ...groupData.revision },
        versionControlInformation: {
          groupId: groupData.id,
          registryId,
          bucketId,
          flowId,
          version: req.body.version,
        },
      }
    );

    res.status(200).send({ ...response.data });
  } catch (error) {
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send(error.message);
  }
});

app.listen(settings.serverPort, settings.serverHost, () => {
  console.log(
    `Server listenning on  ${settings.serverHost}:${settings.serverPort}`
  );
});

//==============================================================================================
//==============================================================================================
// functions
//==============================================================================================
// nifi-registry
async function getFlowVersion(bucketName, flowName, versionNumber) {
  try {
    const bucketId = await getBucketId(bucketName);
    if (!bucketId) {
      return {
        status: 400,
        body: {
          message: 'no bucket with the given name',
        },
      };
    }

    const flowId = await getFlowId(bucketId, flowName);
    if (!flowId) {
      return {
        status: 400,
        body: {
          message: 'no flow with the given name',
        },
      };
    }

    const flowVersion = await getFlow(bucketId, flowId, versionNumber);
    return {
      status: 200,
      // body: { bucketId, flowId, flowData: { ...flowVersion } },
      body: { ...flowVersion },
    };
  } catch (error) {
    throw error;
  }
}

async function getBucketId(bucketName) {
  try {
    const buckets = await getBucketsAsync();
    const bucket = buckets.find((b) => {
      return b.name === bucketName;
    });

    return bucket ? bucket.identifier : null;
  } catch (error) {
    throw error;
  }
}

async function getBucketsAsync() {
  try {
    const response = await axios.get(
      `${settings.nifiRegistryHost}/nifi-registry-api/buckets`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getFlowId(bucketId, flowName) {
  try {
    const flows = await getBucketFlows(bucketId);
    const flow = flows.find((f) => {
      return f.name === flowName;
    });

    return flow ? flow.identifier : null;
  } catch (error) {
    throw error;
  }
}

async function getBucketFlows(bucketId) {
  try {
    const response = await axios.get(
      `${settings.nifiRegistryHost}/nifi-registry-api/buckets/${bucketId}/flows`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getFlow(bucketId, flowId, versionNumber) {
  try {
    const response = await axios.get(
      `${settings.nifiRegistryHost}/nifi-registry-api/buckets/${bucketId}/flows/${flowId}/versions/${versionNumber}/export`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getReistryId(registryName) {
  try {
    const response = await axios.get(
      `${settings.nifiHost}/nifi-api/controller/registry-clients`
    );

    const registry = response.data.registries.find((r) => {
      return r.registry.name === registryName;
    });

    return registry ? registry.id : null;
  } catch (error) {
    throw error;
  }
}
async function getRootGroupId() {
  try {
    const response = await axios.get(
      `${settings.nifiHost}/nifi-api/process-groups/root`
    );

    return response ? response.data.id : null;
  } catch (error) {
    throw error;
  }
}

async function getGroupData(groupName) {
  try {
    const response = await axios.get(
      `${settings.nifiHost}/nifi-api/process-groups/root/process-groups`
    );

    const processGroup = response.data.processGroups.find((pg) => {
      return pg.component.name === groupName;
    });

    return processGroup
      ? { id: processGroup.id, revision: { ...processGroup.revision } }
      : null;
  } catch (error) {
    throw error;
  }
}
