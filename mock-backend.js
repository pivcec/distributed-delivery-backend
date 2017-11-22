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
const countryData = require('./data/country.json');
const ispData = require('./data/isp.json');
const platformData = require('./data/platform.json');

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


app.post('/auth', (request, response) => {
  console.log(`[INFO] Got authentication request for ${request.body.identifiant}.`);

  // Check parameters
  if (!request.body.identifiant || !request.body.password) {
    console.log('[ERR] Malformed request received.');
    response.status(503).send({ message: 'Malformed request!' });
    return;
  }

  // Authenticate user
  const userData = clientData[request.body.identifiant];
  if (userData && userData.password === request.body.password) {
    // Check if user has already logged in
    if (userSet.has(request.body.identifiant)) {
      console.log(`[WARN] Blocked double authentication attempt from ${request.body.identifiant}.`);
      response.status(503).send({ message: 'User already logged in!' });
      return;
    }

    // Generate and store token
    const token = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);

    // Add user to authentication map
    authMap.set(token, request.body.identifiant);
    userSet.add(request.body.identifiant);

    // Return token to User
    console.log(`[INFO] Authenticated ${request.body.identifiant} with token ${token}.`);
    response.send({ session_token: token });
  } else {
    console.log(`[WARN] Failed authentication attempt for ${request.body.identifiant}.`);
    response.status(503).send({ message: 'Authentication failed!' });
  }
});

app.post('/logout', (request, response) => {
  console.log(`[INFO] Got logout request for session ${request.body.session_token}.`);

  // Check parameters
  if (!request.body.session_token) {
    console.log('[ERR] Malformed request received.');
    response.status(503).send({ message: 'Malformed request!' });
    return;
  }

  // End the session
  const userId = authMap.get(request.body.session_token);
  if (userId) {
    userSet.delete(userId);
    authMap.delete(request.body.session_token);
    console.log(`[INFO] Successfully ended session ${request.body.session_token}`);
    response.send();
  } else {
    console.log(`[WARN] Attempt to logout non-existant session ${request.body.session_token}.`);
    response.status(503).send({ message: 'Logout failed!' });
  }
})

// Start listen to requests
app.listen(SERVER_PORT, () => {
  console.log(`[INFO] Mock Streamroot API rock and rollin' at port ${SERVER_PORT}!!!`);
});
