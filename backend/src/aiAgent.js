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
      description: 'Devuelve datos generales, secciones y alertas de un estudiante por id_estudiante, carnet o nombre.',
      parameters: {
        type: 'object',
        properties: {
          id_estudiante: {
            type: ['integer', 'string'],
            description: 'ID numerico, carnet o nombre del estudiante (ej: "15", "2023001", "Ana Morales")',
          },
        },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promedio_estudiante',
      description: 'Promedio general de calificaciones de un estudiante por id, carnet o nombre.',
      parameters: {
        type: 'object',
        properties: {
          id_estudiante: {
            type: ['integer', 'string'],
            description: 'ID numerico, carnet o nombre del estudiante',
          },
        },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'asistencia_estudiante',
      description: 'Porcentaje de asistencia de un estudiante por id, carnet o nombre.',
      parameters: {
        type: 'object',
        properties: {
          id_estudiante: {
            type: ['integer', 'string'],
            description: 'ID numerico, carnet o nombre del estudiante',
          },
        },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alertas_estudiante',
      description: 'Alertas academicas activas (riesgo, inasistencia) de un estudiante por id, carnet o nombre.',
      parameters: {
        type: 'object',
        properties: {
          id_estudiante: {
            type: ['integer', 'string'],
            description: 'ID numerico, carnet o nombre del estudiante',
          },
        },
        required: ['id_estudiante'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estudiantes_en_riesgo',
      description: 'Lista estudiantes con alertas academicas activas. Opcionalmente filtra por seccion.',
      parameters: {
        type: 'object',
        properties: {
          id_seccion: {
            type: ['integer', 'string'],
            description: 'Opcional: id numerico o codigo de seccion/curso (ej: "12", "BD2-A", "BD2")',
          },
        },
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
        properties: {
          id_seccion: {
            type: ['integer', 'string'],
            description: 'ID numerico de seccion o codigo/codigo de curso en texto (ej: "12", "BD2-A", "BD2")',
          },
        },
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
        properties: {
          id_seccion: {
            type: ['integer', 'string'],
            description: 'ID numerico de seccion o codigo/codigo de curso en texto (ej: "12", "BD2-A", "BD2")',
          },
        },
        required: ['id_seccion'],
      },
    },
  },
];

// ---------- Implementacion de cada herramienta ----------
async function ejecutarHerramienta(nombre, args, contexto) {
  const resolverIdSeccion = async (valor) => {
    // 1) Si ya viene numerico (o string numerico), usarlo directo.
    const numerico = Number(valor);
    if (Number.isInteger(numerico) && numerico > 0) {
      return numerico;
    }

    // 2) Si viene texto (codigo de seccion o de curso), buscar mejor coincidencia.
    const texto = String(valor || '').trim();
    if (!texto) return null;

    const r = await pool.request()
      .input('codigoExacto', sql.VarChar(20), texto)
      .input('codigoLike', sql.VarChar(30), `%${texto}%`)
      .query(`
        SELECT TOP 1 s.id_seccion
        FROM tbSeccion s
        INNER JOIN tbCurso c ON c.id_curso = s.id_curso
        WHERE s.codigo_seccion = @codigoExacto
           OR c.codigo = @codigoExacto
           OR s.codigo_seccion LIKE @codigoLike
           OR c.codigo LIKE @codigoLike
        ORDER BY
          CASE
            WHEN s.codigo_seccion = @codigoExacto THEN 0
            WHEN c.codigo = @codigoExacto THEN 1
            ELSE 2
          END,
          s.id_seccion DESC`);

    return r.recordset[0]?.id_seccion ?? null;
  };

  const resolverIdEstudiante = async (valor) => {
    if (contexto.rol === 'Estudiante') return contexto.id_estudiante;

    const numerico = Number(valor);
    if (Number.isInteger(numerico) && numerico > 0) return numerico;

    const texto = String(valor || '').trim();
    if (!texto) return null;

    const r = await pool.request()
      .input('exacto', sql.VarChar(150), texto)
      .input('likeQ', sql.VarChar(170), `%${texto}%`)
      .query(`
        SELECT TOP 1 e.id_estudiante
        FROM tbEstudiante e
        INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
        WHERE e.carnet = @exacto
           OR CONCAT(u.nombre,' ',u.apellido) = @exacto
           OR e.carnet LIKE @likeQ
           OR CONCAT(u.nombre,' ',u.apellido) LIKE @likeQ
        ORDER BY
          CASE
            WHEN e.carnet = @exacto THEN 0
            WHEN CONCAT(u.nombre,' ',u.apellido) = @exacto THEN 1
            ELSE 2
          END,
          e.id_estudiante DESC`);

    return r.recordset[0]?.id_estudiante ?? null;
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
      const id = await resolverIdEstudiante(args.id_estudiante);
      if (!id) return { error: 'No pude identificar al estudiante solicitado. Indica nombre completo, carnet o id.' };
      const r = await pool.request().input('id_estudiante', sql.Int, id).execute('sp_PerfilEstudiante');
      return {
        datos: r.recordsets[0]?.[0] || null,
        secciones: r.recordsets[1] || [],
        alertas: r.recordsets[2] || [],
      };
    }
    case 'promedio_estudiante': {
      const id = await resolverIdEstudiante(args.id_estudiante);
      if (!id) return { error: 'No pude identificar al estudiante solicitado. Indica nombre completo, carnet o id.' };
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio
                FROM tbAsignacion a JOIN tbNota n ON n.id_asignacion=a.id_asignacion
                WHERE a.id_estudiante=@id`);
      return { promedio: r.recordset[0]?.promedio ?? null };
    }
    case 'asistencia_estudiante': {
      const id = await resolverIdEstudiante(args.id_estudiante);
      if (!id) return { error: 'No pude identificar al estudiante solicitado. Indica nombre completo, carnet o id.' };
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT CAST(100.0*SUM(CASE WHEN asi.estado='Presente' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS pct
                FROM tbAsignacion a JOIN tbAsistencia asi ON asi.id_asignacion=a.id_asignacion
                WHERE a.id_estudiante=@id`);
      return { porcentaje_asistencia: r.recordset[0]?.pct ?? null };
    }
    case 'alertas_estudiante': {
      const id = await resolverIdEstudiante(args.id_estudiante);
      if (!id) return { error: 'No pude identificar al estudiante solicitado. Indica nombre completo, carnet o id.' };
      const r = await pool.request().input('id', sql.Int, id)
        .query(`SELECT tipo_alerta, descripcion FROM tbAlertaAcademica WHERE id_estudiante=@id AND resuelta=0`);
      return r.recordset;
    }
    case 'estudiantes_en_riesgo': {
      if (contexto.rol === 'Estudiante') return { error: 'No autorizado' };

      const idSeccion = args?.id_seccion ? await resolverIdSeccion(args.id_seccion) : null;
      const req = pool.request();
      let where = "WHERE a.resuelta = 0 AND a.tipo_alerta IN ('En riesgo','Bajo rendimiento','Inasistencia','Reprobado')";
      if (idSeccion) {
        req.input('id_seccion', sql.Int, idSeccion);
        where += ' AND a.id_seccion = @id_seccion';
      }

      const r = await req.query(`
        SELECT TOP 50 e.id_estudiante, e.carnet,
               CONCAT(u.nombre,' ',u.apellido) AS estudiante,
               a.tipo_alerta, a.descripcion, a.fecha_generacion,
               s.codigo_seccion, c.codigo AS codigo_curso, c.nombre AS curso
        FROM tbAlertaAcademica a
        INNER JOIN tbEstudiante e ON e.id_estudiante = a.id_estudiante
        INNER JOIN tbUsuario u ON u.id_usuario = e.id_usuario
        INNER JOIN tbSeccion s ON s.id_seccion = a.id_seccion
        INNER JOIN tbCurso c ON c.id_curso = s.id_curso
        ${where}
        ORDER BY a.fecha_generacion DESC`);
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
      const idSeccion = await resolverIdSeccion(args.id_seccion);
      if (!idSeccion) return { error: 'No pude identificar la seccion solicitada. Indica el codigo exacto o el id.' };
      const r = await pool.request().input('id_seccion', sql.Int, idSeccion).execute('sp_ReporteNotasSeccion');
      return r.recordset;
    }
    case 'reporte_asistencia_seccion': {
      if (contexto.rol === 'Estudiante') return { error: 'No autorizado' };
      const idSeccion = await resolverIdSeccion(args.id_seccion);
      if (!idSeccion) return { error: 'No pude identificar la seccion solicitada. Indica el codigo exacto o el id.' };
      const r = await pool.request().input('id_seccion', sql.Int, idSeccion).execute('sp_ReporteAsistenciaSeccion');
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
    'Si el usuario menciona la seccion por codigo o por codigo de curso (por ejemplo "BD2-A" o "BD2"), puedes usarlo en id_seccion y el sistema lo resolvera.',
    'Si el usuario pregunta "quienes estan en riesgo" o algo global similar, usa la herramienta estudiantes_en_riesgo.',
    'En herramientas de estudiante, puedes recibir id_estudiante como id, carnet o nombre y el sistema lo resolvera.',
    'Si no hay datos, dilo honestamente.',
    `El usuario actual tiene rol: ${contexto.rol}.`,
  ];
  if (contexto.rol === 'Estudiante' && contexto.id_estudiante) {
    lineas.push(`Su id_estudiante es ${contexto.id_estudiante}. Solo puede consultar su propia informacion.`);
  } else {
    lineas.push('Puede consultar informacion de cualquier estudiante o seccion.');
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
