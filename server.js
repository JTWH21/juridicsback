// server.js
const express = require('express');
const app = express();
const connectDB = require('./db');
const clientRoutes = require('./routes/clients');

app.use(express.json());

connectDB().then(db => {
  app.locals.db = db;
  app.use('/api/clients', clientRoutes);

  const PORT = 3000;
  app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
});
