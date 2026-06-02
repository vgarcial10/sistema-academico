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

function resumirSql(texto, max = 500) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
}

async function registrarMonitoreoConsulta({
  tipoOperacion,
  nombreConsulta,
  resumenConsulta,
  fechaInicio,
  fechaFin,
  duracionMs,
  exito,
  mensajeError,
}) {
  try {
    const req = pool.request();
    req.__skipMonitoring = true;
    await req
      .input('tipo_operacion', sql.VarChar(20), tipoOperacion)
      .input('nombre_consulta', sql.VarChar(200), nombreConsulta)
      .input('resumen_consulta', sql.VarChar(500), resumirSql(resumenConsulta, 500))
      .input('fecha_inicio', sql.DateTime, fechaInicio)
      .input('fecha_fin', sql.DateTime, fechaFin)
      .input('duracion_ms', sql.Int, duracionMs)
      .input('exito', sql.Bit, exito ? 1 : 0)
      .input('mensaje_error', sql.VarChar(500), mensajeError ? resumirSql(mensajeError, 500) : null)
      .query(`
        IF OBJECT_ID('tbMonitoreoConsulta', 'U') IS NOT NULL
        BEGIN
          INSERT INTO tbMonitoreoConsulta
            (tipo_operacion, nombre_consulta, resumen_consulta, fecha_inicio, fecha_fin, duracion_ms, exito, mensaje_error)
          VALUES
            (@tipo_operacion, @nombre_consulta, @resumen_consulta, @fecha_inicio, @fecha_fin, @duracion_ms, @exito, @mensaje_error)
        END
      `);
  } catch {
    // Evitar que una falla en monitoreo rompa la operación principal.
  }
}

function activarMonitoreoConsultas() {
  if (sql.Request.prototype.__monitoringEnabled) return;
  sql.Request.prototype.__monitoringEnabled = true;

  const originalQuery = sql.Request.prototype.query;
  const originalExecute = sql.Request.prototype.execute;

  sql.Request.prototype.query = async function monitoredQuery(command, callback) {
    if (this.__skipMonitoring) return originalQuery.call(this, command, callback);

    const inicio = new Date();
    const t0 = Date.now();
    try {
      const result = await originalQuery.call(this, command, callback);
      await registrarMonitoreoConsulta({
        tipoOperacion: 'QUERY',
        nombreConsulta: 'SQL Query',
        resumenConsulta: command,
        fechaInicio: inicio,
        fechaFin: new Date(),
        duracionMs: Date.now() - t0,
        exito: true,
        mensajeError: null,
      });
      return result;
    } catch (err) {
      await registrarMonitoreoConsulta({
        tipoOperacion: 'QUERY',
        nombreConsulta: 'SQL Query',
        resumenConsulta: command,
        fechaInicio: inicio,
        fechaFin: new Date(),
        duracionMs: Date.now() - t0,
        exito: false,
        mensajeError: err.message,
      });
      throw err;
    }
  };

  sql.Request.prototype.execute = async function monitoredExecute(procedure, callback) {
    if (this.__skipMonitoring) return originalExecute.call(this, procedure, callback);

    const inicio = new Date();
    const t0 = Date.now();
    try {
      const result = await originalExecute.call(this, procedure, callback);
      await registrarMonitoreoConsulta({
        tipoOperacion: 'EXECUTE',
        nombreConsulta: `SP ${procedure}`,
        resumenConsulta: procedure,
        fechaInicio: inicio,
        fechaFin: new Date(),
        duracionMs: Date.now() - t0,
        exito: true,
        mensajeError: null,
      });
      return result;
    } catch (err) {
      await registrarMonitoreoConsulta({
        tipoOperacion: 'EXECUTE',
        nombreConsulta: `SP ${procedure}`,
        resumenConsulta: procedure,
        fechaInicio: inicio,
        fechaFin: new Date(),
        duracionMs: Date.now() - t0,
        exito: false,
        mensajeError: err.message,
      });
      throw err;
    }
  };
}

activarMonitoreoConsultas();

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
