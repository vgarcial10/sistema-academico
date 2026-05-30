const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    database: process.env.DB_DATABASE,
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 15000,
    requestTimeout: 15000
  }
};

const pool = new sql.ConnectionPool(config);

let retries = 0;
const maxRetries = 5;

function connectToDatabase() {
  pool.connect(err => {
    if (err) {
      retries++;
      if (retries <= maxRetries) {
        console.log(`⏳ Reintentando conexión (${retries}/${maxRetries})...`);
        setTimeout(connectToDatabase, 3000);
      } else {
        console.error('❌ No se pudo conectar a SQL Server:', err.message);
      }
    } else {
      console.log('✅ Conectado a dbUniPochinqui');
    }
  });
}

connectToDatabase();

module.exports = { pool, sql };
