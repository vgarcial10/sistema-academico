const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { pool, sql } = require('./db');
const { responderConsulta } = require('./aiAgent');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ====== JWT helpers ======
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado: falta token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware opcional para exigir cierto rol
const requireRole = (...rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.user.nombre_rol)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
};

// ============================================================
// AUTENTICACIÓN
// ============================================================

// LOGIN -> sp_Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena)
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

    const result = await pool.request()
      .input('correo', sql.VarChar(150), correo)
      .input('contrasena', sql.VarChar(255), contrasena)
      .execute('sp_Login');

    const row = result.recordset[0];

    if (!row || row.exito === 0) {
      return res.status(401).json({ error: row ? row.mensaje : 'Credenciales incorrectas' });
    }

    const token = generateToken({
      id_usuario: row.id_usuario,
      id_rol: row.id_rol,
      nombre_rol: row.nombre_rol,
      nombre_completo: row.nombre_completo
    });

    res.json({
      mensaje: row.mensaje,
      token,
      usuario: {
        id_usuario: row.id_usuario,
        id_rol: row.id_rol,
        nombre_rol: row.nombre_rol,
        nombre_completo: row.nombre_completo
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REGISTRO -> sp_RegisUsuario
app.post('/api/auth/register', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { id_rol, nombre, apellido, correo, contrasena } = req.body;
    if (!id_rol || !nombre || !apellido || !correo || !contrasena)
      return res.status(400).json({ error: 'Faltan datos obligatorios' });

    const result = await pool.request()
      .input('id_rol', sql.Int, id_rol)
      .input('nombre', sql.VarChar(100), nombre)
      .input('apellido', sql.VarChar(100), apellido)
      .input('correo', sql.VarChar(150), correo)
      .input('contrasena', sql.VarChar(255), contrasena)
      .input('id_usuario_op', sql.Int, req.user.id_usuario)
      .execute('sp_RegistrarUsuario');

    res.json(result.recordset[0] || { mensaje: 'Usuario registrado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// CATÁLOGOS (lectura simple para llenar formularios)
// ============================================================

app.get('/api/roles', verifyToken, async (req, res) => {
  try {
    const r = await pool.request().query('SELECT id_rol, nombre FROM tbRol ORDER BY nombre');
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/carreras', verifyToken, async (req, res) => {
  try {
    const r = await pool.request().query('SELECT id_carrera, nombre, creditos_totales FROM tbCarrera WHERE activa = 1 ORDER BY nombre');
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cursos', verifyToken, async (req, res) => {
  try {
    const r = await pool.request().query(`
      SELECT c.id_curso, c.codigo, c.nombre, c.creditos, c.ciclo_requerido, car.nombre AS carrera
      FROM tbCurso c INNER JOIN tbCarrera car ON car.id_carrera = c.id_carrera
      WHERE c.activo = 1 ORDER BY c.codigo`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cursos', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { id_carrera, codigo, nombre, creditos, ciclo_requerido } = req.body;
    const codigoNormalizado = String(codigo || '').trim().toUpperCase();
    const nombreNormalizado = String(nombre || '').trim();
    const idCarreraNum = Number(id_carrera);
    const creditosNum = Number(creditos);
    const cicloNum = Number(ciclo_requerido);

    if (!idCarreraNum || !codigoNormalizado || !nombreNormalizado || !creditosNum || !cicloNum) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para crear el curso' });
    }
    if (!Number.isInteger(idCarreraNum)) {
      return res.status(400).json({ error: 'La carrera seleccionada no es válida' });
    }
    if (!Number.isInteger(creditosNum) || creditosNum < 1 || creditosNum > 12) {
      return res.status(400).json({ error: 'Los créditos deben estar entre 1 y 12' });
    }
    if (!Number.isInteger(cicloNum) || cicloNum < 1 || cicloNum > 12) {
      return res.status(400).json({ error: 'El ciclo requerido debe estar entre 1 y 12' });
    }

    const carrera = await pool.request()
      .input('id_carrera', sql.Int, idCarreraNum)
      .query('SELECT TOP 1 id_carrera FROM tbCarrera WHERE id_carrera = @id_carrera AND activa = 1');
    if (!carrera.recordset[0]) {
      return res.status(400).json({ error: 'La carrera seleccionada no existe o está inactiva' });
    }

    const result = await pool.request()
      .input('id_carrera', sql.Int, idCarreraNum)
      .input('codigo', sql.VarChar(20), codigoNormalizado)
      .input('nombre', sql.VarChar(150), nombreNormalizado)
      .input('creditos', sql.Int, creditosNum)
      .input('ciclo_requerido', sql.Int, cicloNum)
      .query(`
        INSERT INTO tbCurso (id_carrera, codigo, nombre, creditos, ciclo_requerido, activo)
        OUTPUT inserted.id_curso, inserted.codigo, inserted.nombre, inserted.creditos, inserted.ciclo_requerido
        VALUES (@id_carrera, @codigo, @nombre, @creditos, @ciclo_requerido, 1)`);

    res.status(201).json({
      exito: 1,
      mensaje: 'Curso creado correctamente',
      curso: result.recordset[0],
    });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ error: 'Ya existe un curso con ese código' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/secciones', verifyToken, async (req, res) => {
  try {
    const r = await pool.request().query(`
      SELECT s.id_seccion, s.codigo_seccion, s.horario, s.salon, s.estado,
             c.nombre AS curso, CONCAT(u.nombre,' ',u.apellido) AS docente,
             p.nombre AS periodo, s.cupo_maximo
      FROM tbSeccion s
      INNER JOIN tbCurso c ON c.id_curso = s.id_curso
      INNER JOIN tbDocente d ON d.id_docente = s.id_docente
      INNER JOIN tbUsuario u ON u.id_usuario = d.id_usuario
      INNER JOIN tbPeriodoAcademico p ON p.id_periodo = s.id_periodo
      ORDER BY s.codigo_seccion`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/estudiantes', verifyToken, async (req, res) => {
  try {
    const r = await pool.request().query(`
      SELECT e.id_estudiante, e.carnet, e.ciclo_actual, e.estado_academico,
             CONCAT(u.nombre,' ',u.apellido) AS nombre_completo, u.correo,
             car.nombre AS carrera
      FROM tbEstudiante e
      INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
      INNER JOIN tbCarrera car ON car.id_carrera = e.id_carrera
      ORDER BY e.carnet`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Identifica el registro de estudiante del usuario autenticado.
app.get('/api/estudiantes/me', verifyToken, requireRole('Estudiante'), async (req, res) => {
  try {
    const r = await pool.request()
      .input('id_usuario', sql.Int, req.user.id_usuario)
      .query(`
        SELECT TOP 1 e.id_estudiante, e.carnet, e.ciclo_actual, e.estado_academico,
               CONCAT(u.nombre,' ',u.apellido) AS nombre_completo, u.correo,
               car.nombre AS carrera
        FROM tbEstudiante e
        INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
        INNER JOIN tbCarrera car ON car.id_carrera = e.id_carrera
        WHERE e.id_usuario = @id_usuario`);

    const estudiante = r.recordset[0];
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró el estudiante asociado al usuario actual' });
    }
    res.json(estudiante);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/actividades/:id_seccion', verifyToken, async (req, res) => {
  try {
    const r = await pool.request()
      .input('id_seccion', sql.Int, req.params.id_seccion)
      .query('SELECT id_actividad, nombre, tipo, ponderacion, fecha_entrega FROM tbActividadEvaluacion WHERE id_seccion = @id_seccion');
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Estudiantes inscritos (asignaciones activas) de una seccion, con su id_asignacion.
// Necesario para registrar notas/asistencia, que operan por id_asignacion.
app.get('/api/asignaciones/:id_seccion', verifyToken, async (req, res) => {
  try {
    const r = await pool.request()
      .input('id_seccion', sql.Int, req.params.id_seccion)
      .query(`
        SELECT a.id_asignacion, a.estado, e.id_estudiante, e.carnet,
               CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo
        FROM tbAsignacion a
        INNER JOIN tbEstudiante e ON e.id_estudiante = a.id_estudiante
        INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
        WHERE a.id_seccion = @id_seccion AND a.estado = 'Activa'
        ORDER BY u.apellido, u.nombre`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// OPERACIONES (via stored procedures)
// ============================================================

// Asignar estudiante a sección -> sp_AsignarEstudiante
app.post('/api/asignaciones', verifyToken, requireRole('Administrador', 'Docente'), async (req, res) => {
  try {
    const { id_seccion, id_estudiante } = req.body;
    const result = await pool.request()
      .input('id_seccion', sql.Int, id_seccion)
      .input('id_estudiante', sql.Int, id_estudiante)
      .input('id_usuario_op', sql.Int, req.user.id_usuario)
      .execute('sp_AsignarEstudiante');
    res.json(result.recordset[0] || { mensaje: 'Asignación realizada' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Registrar nota -> sp_RegistrarNota
app.post('/api/notas', verifyToken, requireRole('Administrador', 'Docente'), async (req, res) => {
  try {
    const { id_asignacion, id_actividad, calificacion } = req.body;
    const result = await pool.request()
      .input('id_asignacion', sql.Int, id_asignacion)
      .input('id_actividad', sql.Int, id_actividad)
      .input('calificacion', sql.Decimal(5, 2), calificacion)
      .input('id_usuario_op', sql.Int, req.user.id_usuario)
      .execute('sp_RegistrarNota');
    res.json(result.recordset[0] || { mensaje: 'Nota registrada' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Registrar asistencia -> sp_RegistrarAsistencia
app.post('/api/asistencia', verifyToken, requireRole('Administrador', 'Docente'), async (req, res) => {
  try {
    const { id_asignacion, fecha, estado } = req.body;
    const result = await pool.request()
      .input('id_asignacion', sql.Int, id_asignacion)
      .input('fecha', sql.Date, fecha)
      .input('estado', sql.VarChar(20), estado)
      .input('id_usuario_op', sql.Int, req.user.id_usuario)
      .execute('sp_RegistrarAsistencia');
    res.json(result.recordset[0] || { mensaje: 'Asistencia registrada' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// PERFIL Y REPORTES (via stored procedures)
// ============================================================

// Perfil completo del estudiante -> sp_PerfilEstudiante (devuelve 3 recordsets)
app.get('/api/perfil/:id_estudiante', verifyToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('id_estudiante', sql.Int, req.params.id_estudiante)
      .execute('sp_PerfilEstudiante');
    res.json({
      datos: result.recordsets[0]?.[0] || null,
      secciones: result.recordsets[1] || [],
      alertas: result.recordsets[2] || []
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reporte de notas por sección -> sp_ReporteNotasSeccion
app.get('/api/reportes/notas/:id_seccion', verifyToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('id_seccion', sql.Int, req.params.id_seccion)
      .execute('sp_ReporteNotasSeccion');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reporte de asistencia por sección -> sp_ReporteAsistenciaSeccion
app.get('/api/reportes/asistencia/:id_seccion', verifyToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('id_seccion', sql.Int, req.params.id_seccion)
      .execute('sp_ReporteAsistenciaSeccion');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// AUDITORÍA (lectura de la bitácora)
// ============================================================
app.get('/api/auditoria', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const r = await pool.request().query(`
      SELECT TOP 100 b.id_bitacora, b.accion, b.tabla_afectada, b.id_registro_afectado,
             b.datos_anteriores, b.datos_nuevos, b.fecha_hora,
             CONCAT(u.nombre,' ',u.apellido) AS usuario
      FROM tbBitacoraAuditoria b
      LEFT JOIN tbUsuario u ON u.id_usuario = b.id_usuario
      ORDER BY b.fecha_hora DESC`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// IA SIMPLE (consultas en lenguaje natural sobre el estudiante)
// ============================================================
app.post('/api/ai/consulta', verifyToken, async (req, res) => {
  try {
    const { pregunta, id_estudiante } = req.body;
    let idEstudianteConsulta = id_estudiante ?? null;

    if (req.user.nombre_rol === 'Estudiante') {
      const r = await pool.request()
        .input('id_usuario', sql.Int, req.user.id_usuario)
        .query('SELECT TOP 1 id_estudiante FROM tbEstudiante WHERE id_usuario = @id_usuario');
      const row = r.recordset[0];
      if (!row) {
        return res.status(404).json({ error: 'No se encontró un registro de estudiante para el usuario actual' });
      }
      idEstudianteConsulta = row.id_estudiante;
    }

    // Si hay GROQ_API_KEY, usar el agente de IA con herramientas ancladas a la BD.
    if (process.env.GROQ_API_KEY) {
      const { respuesta } = await responderConsulta({
        pregunta,
        id_estudiante: idEstudianteConsulta,
        usuario: req.user,
      });
      return res.json({ respuesta, timestamp: new Date() });
    }

    // Fallback sin LLM: respuestas por reglas (palabras clave).
    const q = (pregunta || '').toLowerCase();
    let respuesta = 'No entendí tu pregunta. Pregunta sobre: promedio, riesgo, asistencia o alertas.';

    if (idEstudianteConsulta) {
      if (q.includes('promedio')) {
        const r = await pool.request()
          .input('id', sql.Int, idEstudianteConsulta)
          .query(`SELECT CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS prom
                  FROM tbAsignacion a JOIN tbNota n ON n.id_asignacion=a.id_asignacion
                  WHERE a.id_estudiante=@id`);
        const prom = r.recordset[0]?.prom;
        respuesta = prom ? `Tu promedio general es ${prom}.` : 'Aún no tienes notas registradas.';
      } else if (q.includes('riesgo') || q.includes('alerta')) {
        const r = await pool.request()
          .input('id', sql.Int, idEstudianteConsulta)
          .query(`SELECT tipo_alerta, descripcion FROM tbAlertaAcademica WHERE id_estudiante=@id AND resuelta=0`);
        respuesta = r.recordset.length
          ? `Tienes ${r.recordset.length} alerta(s): ` + r.recordset.map(a => a.tipo_alerta).join(', ')
          : 'No tienes alertas activas. Vas bien.';
      } else if (q.includes('asistencia')) {
        const r = await pool.request()
          .input('id', sql.Int, idEstudianteConsulta)
          .query(`SELECT 100.0*SUM(CASE WHEN asi.estado='Presente' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS pct
                  FROM tbAsignacion a JOIN tbAsistencia asi ON asi.id_asignacion=a.id_asignacion
                  WHERE a.id_estudiante=@id`);
        const pct = r.recordset[0]?.pct;
        respuesta = pct != null ? `Tu asistencia es del ${Number(pct).toFixed(0)}%.` : 'No hay registros de asistencia.';
      }
    }
    res.json({ respuesta, timestamp: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en http://localhost:${PORT}`));

module.exports = app;
