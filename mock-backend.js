const express = require('express');
const app = express();

// Settings
const SERVER_PORT = 3000;

app.get('/', (req, res) => {
  res.send('Boilerplating hard...');
});

app.listen(SERVER_PORT, () => {
  console.log(`Mock Streamroot API rock and rollin' at port ${SERVER_PORT}!!!`);
});
