const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Settings
const SERVER_PORT = 3000;

// Load data

// Client Information
const clientData = require('./data/clients.json');

// Raw data
const audienceData = new Map([
  [0, require('./data/audience1.json')],
  [1, require('./data/audience2.json')],
  [2, { audience: [] }],
]);

const bandwidthData = new Map([
  [0, require('./data/bandwidth1.json')],
  [1, require('./data/bandwidth2.json')],
  [2, { cdn: [], p2p: [] }],
]);

const streamData = new Map([
  [0, require('./data/streams1.json')],
  [1, require('./data/streams2.json')],
  [2, []],
]);

const notificationData = require('./data/notifications.json');
let countryData = require('./data/country.json');
let ispData = require('./data/isp.json');
let platformData = require('./data/platform.json');

console.log('[INIT] Loaded data...');

// Process data

// Shift all audience timestamps to end on Date.now() instead
const nowTimestamp = Date.now();
for (const data of audienceData.values()) {
  // Calculate time offset
  const lastEntry = data.audience.slice(-1)[0];
  if (lastEntry != null) {
    const offset = nowTimestamp - lastEntry[0];
    // Shift all timestamps
    for (const entry of data.audience) {
      entry[0] += offset;
    }
  }
}

// Shift all bandwidth timestamp to end on Date.now() instead
for (const data of bandwidthData.values()) {
  for (const subkey of ['cdn', 'p2p']) {
    // Calculate time offset
    const dataArray = data[subkey];
    const lastEntry = dataArray.slice(-1)[0];
    if (lastEntry) {
      const offset = nowTimestamp - lastEntry[0];
      // Shift all timestamps
      for (const entry of dataArray) {
        entry[0] += offset;
      }
    }
  }
}

// Remove unused fields from raw data
countryData = countryData.map((entry) => {
  return {
    cdn: entry.cdn,
    p2p: entry.p2p,
    country: entry.country,
  };
});

ispData = ispData.map((entry) => {
  return {
    cdn: entry.cdn,
    p2p: entry.p2p,
    isp: entry.isp,
  }
});

platformData = platformData.map((entry) => {
  return {
    platform: entry.platform,
    cdn: entry.cdn,
    p2p: entry.p2p,
    upload: entry.upload,
    max_viewers: entry.maxViewers,
    average_viewers: entry.averageViewers,
  }
});

// Filter data on each key
for (const key of streamData.keys()) {
  const rawData = streamData.get(key);
  const processedData = rawData.map((entry) => {
    return {
      cdn: entry.cdn,
      p2p: entry.p2p,
      manifest: entry.manifest,
      max_viewers: entry.maxViewers,
      average_viewers: entry.averageViewers,
    };
  });
  streamData.set(key, processedData);
}

console.log('[INIT] Processed data...');

// Initialize initial server states
const authMap = new Map();
const userSet = new Set();

// Handling request routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (request, response) => {
  response.send('<pre>Check out README.md for more details on this mock backend server :D</pre>');
});

// Authhentication route
app.post('/auth', (request, response) => {
  // Check parameters
  if (!request.body.identifiant || !request.body.password) {
    response.status(503).send();
    return;
  }

  // Authenticate user
  const userData = clientData[request.body.identifiant];
  if (userData && userData.password === request.body.password) {
    // Check if user has already logged in
    if (userSet.has(request.body.identifiant)) {
      response.status(503).send();
      return;
    }

    // Generate and store token
    const token = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);

    // Add user to authentication map
    authMap.set(token, request.body.identifiant);
    userSet.add(request.body.identifiant);

    // Return token to User
    response.send({ session_token: token });
  } else {
    response.status(503).send();
  }
});

// Logout route
app.post('/logout', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // End the session
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    userSet.delete(userId);
    authMap.delete(request.body.session_token);
    response.send();
  } else {
    response.status(503).send();
  }
});

// User info route
app.post('/myinfo', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Extract and return user information
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    // Remove undesired fields
    const clientDataClone = JSON.parse(JSON.stringify(clientData[userId]));
    for (const fieldname of ['password']) {
      delete clientDataClone.password;
    }
    response.send(clientDataClone);
  } else {
    response.status(503).send();
  }
});

// Password update route
app.post('/updatepwd', (request, response) => {
  // Check parameters
  if (!request.body.session_token || !request.body.old_password || !request.body.new_password) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    // Check old password
    const userData = clientData[userId];
    if (userData.password === request.body.old_password) {
      // We are pretty sure this is the right guy, change his password
      userData.password = request.body.new_password;
      response.send();
    } else {
      response.status(503).send();
    }
  } else {
    response.status(503).send();
  }
});

// User profile update route
app.post('/updateinfo', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    // We are pretty sure this is the right guy, update his profile
    const allowedNames = new Set(['company', 'fname', 'lname', 'email', 'website', 'description']);
    const userData = clientData[userId];
    for (const key of Object.keys(request.body)) {
      if (allowedNames.has(key)) {
        userData[key] = request.body[key];
      }
    }
    response.send();
  } else {
    response.status(503).send();
  }
});

// User notification routes
app.post('/notifications', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    response.send(notificationData[clientData[userId].clientid]);
  } else {
    response.status(503).send();
  }
});

// Same-for-all users data route

// Stats by country
app.post('/countries', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    response.send(countryData);
  } else {
    response.status(503).send();
  }
});

// Stats by ISP
app.post('/isps', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    response.send(ispData);
  } else {
    response.status(503).send();
  }
});

// Stats by platform
app.post('/platforms', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    response.send(platformData);
  } else {
    response.status(503).send();
  }
});

// Stats by stream
app.post('/streams', (request, response) => {
  // Check parameters
  if (!request.body.session_token) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    response.send(streamData.get(clientData[userId].clientid));
  } else {
    response.status(503).send();
  }
});

// Sliced bandwidth
app.post('/bandwidth', (request, response) => {
  // Check parameters
  if (!request.body.session_token || !request.body.from || !request.body.to) {
    response.status(503).send();
    return;
  }

  // Check session validity
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    // Slice out the data we need
    const wholeData = bandwidthData.get(clientData[userId].clientid);
    const fromTimestamp = request.body.from;
    const toTimestamp = request.body.to;
    const slicedData = { cdn: [], p2p: []};
    for (const key of ['cdn', 'p2p']) {
      for (const entry of wholeData[key]) {
        if (entry[0] >= fromTimestamp && entry[0] <= toTimestamp) {
          slicedData[key].push(entry);
        }
      }
    }

    // Different responses depending on aggregation (or not)
    if (!request.body.aggregate) {
      response.send(slicedData);
    } else {
      if (slicedData.cdn.length === 0 || slicedData.p2p.length === 0) {
        response.send({
          cdn: 0,
          p2p: 0,
        });
        return;
      }

      let aggregateFunc;
      switch (request.body.aggregate) {
        case 'sum':
          aggregateFunc = (arr) => {
            return arr.reduce((accumulator, value) => {
              return accumulator + value;
            }, 0);
          };
          break;
        case 'max':
          aggregateFunc = (arr) => {
            return arr.reduce((accumulator, value) => {
              return accumulator < value ? value : accumulator;
            }, Number.MIN_SAFE_INTEGER);
          };
          break;
        case 'min':
        aggregateFunc = (arr) => {
          return arr.reduce((accumulator, value) => {
            return accumulator > value ? value : accumulator;
          }, Number.MAX_SAFE_INTEGER);
        };
          break;
        case 'average':
          aggregateFunc = (arr) => {
            return arr.length ? arr.reduce((accumulator, value) => {
              return accumulator + value;
            }, 0) / arr.length : 0;
          };
          break;
        default:
          response.status(503).send();
          return;
      }
      response.send({
        cdn: aggregateFunc(slicedData.cdn.map((entry) => entry[1])),
        p2p: aggregateFunc(slicedData.p2p.map((entry) => entry[1])),
      });
    }
  } else {
    response.status(503).send();
  }
});

// Start listen to requests
app.listen(SERVER_PORT, () => {
  console.log(`[INFO] Mock Streamroot API rock and rollin' at port ${SERVER_PORT}!!!`);
});
