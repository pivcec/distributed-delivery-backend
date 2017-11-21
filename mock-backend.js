const express = require('express');
const app = express();

// Settings
const SERVER_PORT = 3000;

// TODO: Load data

// TODO: Process data

// TODO: Initialize initial server states

// TODO: Handling request routes 
app.get('/', (req, res) => {
  res.send('<pre>Check out README.md for more details on this mock backend server :D</pre>');
});

app.listen(SERVER_PORT, () => {
  console.log(`Mock Streamroot API rock and rollin' at port ${SERVER_PORT}!!!`);
});
