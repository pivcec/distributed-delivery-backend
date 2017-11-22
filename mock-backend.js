const express = require('express');
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

// TODO: Handling request routes 
app.get('/', (req, res) => {
  res.send('<pre>Check out README.md for more details on this mock backend server :D</pre>');
});

app.listen(SERVER_PORT, () => {
  console.log(`Mock Streamroot API rock and rollin' at port ${SERVER_PORT}!!!`);
});
