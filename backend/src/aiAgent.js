// ============================================================
// AGENTE DE IA (Groq + function calling)
// El modelo interpreta la pregunta y decide que herramienta usar.
// Cada herramienta ejecuta una consulta/SP real, de modo que las
// respuestas quedan ancladas a datos verdaderos (sin inventar notas).
// ============================================================
require('dotenv').config();
const Groq = require('groq-sdk');
const { pool, sql } = require('./db');

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// ---------- Definicion de herramientas expuestas al modelo ----------
const tools = [
  {
    type: 'function',
    function: {
      name: 'buscar_estudiante',
      description: 'Busca estudiantes por nombre o carnet. Util para obtener el id_estudiante a partir de un nombre.',
      parameters: {
        type: 'object',
        properties: { texto: { type: 'string', description: 'Nombre o carnet a buscar' } },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'perfil_estudiante',
      description: 'Devuelve datos generales, secciones y alertas de un estudiante por su id_estudiante.',
      parameters: {
        type: 'object',
        properties: { id_estudiante: { type: 'integer' } },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promedio_estudiante',
      description: 'Promedio general de calificaciones de un estudiante.',
      parameters: {
        type: 'object',
        properties: { id_estudiante: { type: 'integer' } },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'asistencia_estudiante',
      description: 'Porcentaje de asistencia de un estudiante.',
      parameters: {
        type: 'object',
        properties: { id_estudiante: { type: 'integer' } },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alertas_estudiante',
      description: 'Alertas academicas activas (riesgo, inasistencia) de un estudiante.',
      parameters: {
        type: 'object',
        properties: { id_estudiante: { type: 'integer' } },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_secciones',
      description: 'Lista las secciones con su id_seccion, codigo, curso y docente.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reporte_notas_seccion',
      description: 'Reporte de notas de una seccion (promedios por estudiante).',
      parameters: {
        type: 'object',
        properties: { id_seccion: { type: 'integer' } },
        required: ['id_seccion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reporte_asistencia_seccion',
      description: 'Reporte de asistencia de una seccion (porcentajes por estudiante).',
      parameters: {
        type: 'object',
        properties: { id_seccion: { type: 'integer' } },
        required: ['id_seccion'],
      },
    },
  },
];

// ---------- Implementacion de cada herramienta ----------
async function ejecutarHerramienta(nombre, args, contexto) {
  // Un estudiante solo puede consultar su propia informacion.
  const forzarPropio = (id) => {
    if (contexto.rol === 'Estudiante') return contexto.id_estudiante;
    return id;
  };

  switch (nombre) {
    case 'buscar_estudiante': {
      const r = await pool.request()
        .input('q', sql.VarChar(150), `%${args.texto}%`)
        .query(`SELECT TOP 10 e.id_estudiante, e.carnet,
                       CONCAT(u.nombre,' ',u.apellido) AS nombre, car.nombre AS carrera
                FROM tbEstudiante e
                INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
                INNER JOIN tbCarrera car ON car.id_carrera = e.id_carrera
                WHERE CONCAT(u.nombre,' ',u.apellido) LIKE @q OR e.carnet LIKE @q`);
      return r.recordset;
    }
    case 'perfil_estudiante': {
      const id = forzarPropio(args.id_estudiante);
      const r = await pool.request().input('id_estudiante', sql.Int, id).execute('sp_PerfilEstudiante');
      return {
        datos: r.recordsets[0]?.[0] || null,
        secciones: r.recordsets[1] || [],
        alertas: r.recordsets[2] || [],
      };
    }
    case 'promedio_estudiante': {
      const id = forzarPropio(args.id_estudiante);
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio
                FROM tbAsignacion a JOIN tbNota n ON n.id_asignacion=a.id_asignacion
                WHERE a.id_estudiante=@id`);
      return { promedio: r.recordset[0]?.promedio ?? null };
    }
    case 'asistencia_estudiante': {
      const id = forzarPropio(args.id_estudiante);
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT CAST(100.0*SUM(CASE WHEN asi.estado='Presente' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS pct
                FROM tbAsignacion a JOIN tbAsistencia asi ON asi.id_asignacion=a.id_asignacion
                WHERE a.id_estudiante=@id`);
      return { porcentaje_asistencia: r.recordset[0]?.pct ?? null };
    }
    case 'alertas_estudiante': {
      const id = forzarPropio(args.id_estudiante);
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT tipo_alerta, descripcion FROM tbAlertaAcademica WHERE id_estudiante=@id AND resuelta=0`);
      return r.recordset;
    }
    case 'listar_secciones': {
      const r = await pool.request().query(`
        SELECT s.id_seccion, s.codigo_seccion, c.nombre AS curso,
               CONCAT(u.nombre,' ',u.apellido) AS docente
        FROM tbSeccion s
        INNER JOIN tbCurso c ON c.id_curso = s.id_curso
        INNER JOIN tbDocente d ON d.id_docente = s.id_docente
        INNER JOIN tbUsuario u ON u.id_usuario = d.id_usuario
        ORDER BY s.codigo_seccion`);
      return r.recordset;
    }
    case 'reporte_notas_seccion': {
      if (contexto.rol === 'Estudiante') return { error: 'No autorizado' };
      const r = await pool.request().input('id_seccion', sql.Int, args.id_seccion).execute('sp_ReporteNotasSeccion');
      return r.recordset;
    }
    case 'reporte_asistencia_seccion': {
      if (contexto.rol === 'Estudiante') return { error: 'No autorizado' };
      const r = await pool.request().input('id_seccion', sql.Int, args.id_seccion).execute('sp_ReporteAsistenciaSeccion');
      return r.recordset;
    }
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

function systemPrompt(contexto) {
  const lineas = [
    'Eres el asistente academico del "Sistema Academico Integrado" de la Universidad Mariano Galvez.',
    'Respondes en espanol, de forma breve y clara.',
    'IMPORTANTE: para cualquier dato (notas, promedios, asistencia, alertas, reportes) DEBES usar las herramientas disponibles. Nunca inventes calificaciones ni cifras.',
    'Si no hay datos, dilo honestamente.',
    `El usuario actual tiene rol: ${contexto.rol}.`,
  ];
  if (contexto.rol === 'Estudiante' && contexto.id_estudiante) {
    lineas.push(`Su id_estudiante es ${contexto.id_estudiante}. Solo puede consultar su propia informacion.`);
  } else {
    lineas.push('Puede consultar informacion de cualquier estudiante o seccion. Si menciona un nombre, usa buscar_estudiante para obtener el id.');
  }
  return lineas.join(' ');
}

// ---------- Loop principal del agente ----------
async function responderConsulta({ pregunta, id_estudiante, usuario }) {
  if (!groq) {
    return { respuesta: 'El asistente con IA no esta configurado (falta GROQ_API_KEY).' };
  }

  const contexto = {
    rol: usuario?.nombre_rol,
    id_estudiante: id_estudiante ?? null,
  };

  const messages = [
    { role: 'system', content: systemPrompt(contexto) },
    { role: 'user', content: pregunta || '' },
  ];

  const MAX_ITER = 5;
  for (let i = 0; i < MAX_ITER; i++) {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    });

    const msg = completion.choices[0].message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { respuesta: msg.content || 'No pude generar una respuesta.' };
    }

    // Registrar la decision del modelo y ejecutar cada herramienta solicitada.
    messages.push(msg);
    for (const tc of msg.tool_calls) {
      let resultado;
      try {
        const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        resultado = await ejecutarHerramienta(tc.function.name, args, contexto);
      } catch (err) {
        resultado = { error: err.message };
      }
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(resultado),
      });
    }
  }

  return { respuesta: 'No pude completar la consulta (demasiados pasos).' };
}

module.exports = { responderConsulta };
