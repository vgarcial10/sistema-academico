const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ====== INICIALIZAR BD ======
async function initDB() {
  try {
    // Esperar a que el pool esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const request = pool.request();
    
    // Crear tabla de usuarios
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios' AND xtype='U')
      BEGIN
        CREATE TABLE usuarios (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          nombre VARCHAR(100) NOT NULL,
          rol VARCHAR(20) NOT NULL,
          activo BIT DEFAULT 1,
          fecha_creacion DATETIME DEFAULT GETDATE()
        )
      END
    `);

    // Crear tabla de estudiantes
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='estudiantes' AND xtype='U')
      BEGIN
        CREATE TABLE estudiantes (
          id VARCHAR(36) PRIMARY KEY,
          usuario_id VARCHAR(36) NOT NULL,
          matricula VARCHAR(20) UNIQUE NOT NULL,
          carrera VARCHAR(100),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      END
    `);

    // Crear tabla de cursos
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cursos' AND xtype='U')
      BEGIN
        CREATE TABLE cursos (
          id VARCHAR(36) PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          codigo VARCHAR(20) UNIQUE NOT NULL,
          creditos INT,
          docente_id VARCHAR(36),
          FOREIGN KEY (docente_id) REFERENCES usuarios(id)
        )
      END
    `);

    // Crear tabla de notas
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notas' AND xtype='U')
      BEGIN
        CREATE TABLE notas (
          id VARCHAR(36) PRIMARY KEY,
          estudiante_id VARCHAR(36) NOT NULL,
          curso_id VARCHAR(36) NOT NULL,
          parcial1 FLOAT,
          parcial2 FLOAT,
          final FLOAT,
          promedio FLOAT,
          FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
          FOREIGN KEY (curso_id) REFERENCES cursos(id)
        )
      END
    `);

    console.log('✅ Base de datos inicializada');
  } catch (err) {
    console.error('Error BD:', err.message);
  }
}

// Llamar después de 3 segundos
setTimeout(initDB, 3000);

// ====== AUTENTICACIÓN ======
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ====== RUTAS ======

// REGISTRO
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, rol } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const request = pool.request();
    request.input('id', userId);
    request.input('email', email);
    request.input('password', hashedPassword);
    request.input('nombre', nombre);
    request.input('rol', rol || 'estudiante');

    await request.query(
      `INSERT INTO usuarios (id, email, password, nombre, rol) 
       VALUES (@id, @email, @password, @nombre, @rol)`
    );

    res.json({ 
      id: userId, 
      token: generateToken(userId) 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const request = pool.request();
    request.input('email', email);
    const result = await request.query(
      'SELECT * FROM usuarios WHERE email = @email'
    );

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

    res.json({ 
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      token: generateToken(user.id)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CRUD ESTUDIANTES
app.get('/api/estudiantes', verifyToken, async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(
      `SELECT e.*, u.nombre, u.email FROM estudiantes e
       JOIN usuarios u ON e.usuario_id = u.id`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estudiantes', verifyToken, async (req, res) => {
  try {
    const { usuario_id, matricula, carrera } = req.body;
    const id = uuidv4();

    const request = pool.request();
    request.input('id', id);
    request.input('usuario_id', usuario_id);
    request.input('matricula', matricula);
    request.input('carrera', carrera);

    await request.query(
      `INSERT INTO estudiantes (id, usuario_id, matricula, carrera)
       VALUES (@id, @usuario_id, @matricula, @carrera)`
    );

    res.json({ id, mensaje: 'Estudiante creado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CRUD CURSOS
app.get('/api/cursos', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query('SELECT * FROM cursos');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cursos', verifyToken, async (req, res) => {
  try {
    const { nombre, codigo, creditos, docente_id } = req.body;
    const id = uuidv4();

    const request = pool.request();
    request.input('id', id);
    request.input('nombre', nombre);
    request.input('codigo', codigo);
    request.input('creditos', creditos);
    request.input('docente_id', docente_id);

    await request.query(
      `INSERT INTO cursos (id, nombre, codigo, creditos, docente_id)
       VALUES (@id, @nombre, @codigo, @creditos, @docente_id)`
    );

    res.json({ id, mensaje: 'Curso creado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CRUD NOTAS
app.get('/api/notas/:estudiante_id', verifyToken, async (req, res) => {
  try {
    const request = pool.request();
    request.input('estudiante_id', req.params.estudiante_id);
    const result = await request.query(
      `SELECT * FROM notas WHERE estudiante_id = @estudiante_id`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notas', verifyToken, async (req, res) => {
  try {
    const { estudiante_id, curso_id, parcial1, parcial2, final } = req.body;
    const id = uuidv4();
    const promedio = (parcial1 + parcial2 + final) / 3;

    const request = pool.request();
    request.input('id', id);
    request.input('estudiante_id', estudiante_id);
    request.input('curso_id', curso_id);
    request.input('parcial1', parcial1);
    request.input('parcial2', parcial2);
    request.input('final', final);
    request.input('promedio', promedio);

    await request.query(
      `INSERT INTO notas (id, estudiante_id, curso_id, parcial1, parcial2, final, promedio)
       VALUES (@id, @estudiante_id, @curso_id, @parcial1, @parcial2, @final, @promedio)`
    );

    res.json({ id, promedio });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

module.exports = app;
