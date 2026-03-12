// Simple startup script to ensure DB is initialized before starting server
const { initializeDatabase } = require('./src/config/db');

console.log('Initializing database...');
initializeDatabase();

// Give DB a moment to initialize
setTimeout(() => {
  console.log('Starting server...');
  require('./src/server');
}, 1000);