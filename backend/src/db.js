const sql = require('mssql');
require('dotenv').config();

// Primero conectar a master
const masterConfig = {
  server: process.env.DB_SERVER,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000,
    requestTimeout: 5000
  }
};

// Luego conectar a la BD del proyecto
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
    connectionTimeout: 5000,
    requestTimeout: 5000
  }
};

const masterPool = new sql.ConnectionPool(masterConfig);
const pool = new sql.ConnectionPool(config);

// Crear BD primero
async function createDatabase() {
  try {
    const conn = await masterPool.connect();
    console.log('✅ Conectado a master');
    
    const request = conn.request();
    await request.query(
      `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SistemaAcademico')
       BEGIN
         CREATE DATABASE SistemaAcademico
       END`
    );
    console.log('✅ BD SistemaAcademico creada o ya existe');
    
    conn.close();
    
    // Ahora conectar a la BD del proyecto
    pool.connect(err => {
      if (err) {
        console.error('❌ Error conexión BD:', err.message);
      } else {
        console.log('✅ Conectado a SistemaAcademico');
      }
    });
  } catch (err) {
    console.error('❌ Error creando BD:', err.message);
    setTimeout(createDatabase, 3000);
  }
}

createDatabase();

module.exports = pool;
