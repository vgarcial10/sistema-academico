CREATE DATABASE dbUniPochinqui
USE dbUniPochinqui;


-- ============================================================
-- ROL
-- ============================================================
CREATE TABLE tbRol (
    id_rol      INT           NOT NULL IDENTITY(1,1),
    nombre      VARCHAR(50)   NOT NULL,
    descripcion VARCHAR(255)  NULL,

    CONSTRAINT PK_ROL PRIMARY KEY (id_rol),
    CONSTRAINT UQ_ROL_nombre UNIQUE (nombre)
);

-- ============================================================
-- CARRERA
-- ============================================================
CREATE TABLE tbCarrera (
    id_carrera       INT           NOT NULL IDENTITY(1,1),
    nombre           VARCHAR(150)  NOT NULL,
    descripcion      VARCHAR(500)  NULL,
    creditos_totales INT           NOT NULL CHECK (creditos_totales > 0),
    activa           BIT           NOT NULL DEFAULT 1,

    CONSTRAINT PK_CARRERA PRIMARY KEY (id_carrera),
    CONSTRAINT UQ_CARRERA_nombre UNIQUE (nombre)
);

-- ============================================================
-- PERIODO_ACADEMICO
-- ============================================================
CREATE TABLE tbPeriodoAcademico (
    id_periodo   INT          NOT NULL IDENTITY(1,1),
    nombre       VARCHAR(100) NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    activo       BIT          NOT NULL DEFAULT 0,

    CONSTRAINT PK_PERIODO_ACADEMICO PRIMARY KEY (id_periodo),
    CONSTRAINT UQ_PERIODO_nombre UNIQUE (nombre),
    CONSTRAINT CK_PERIODO_fechas CHECK (fecha_fin > fecha_inicio)
);

-- ============================================================
-- USUARIO
-- ============================================================
CREATE TABLE tbUsuario (
    id_usuario     INT           NOT NULL IDENTITY(1,1),
    id_rol         INT           NOT NULL,
    nombre         VARCHAR(100)  NOT NULL,
    apellido       VARCHAR(100)  NOT NULL,
    correo         VARCHAR(150)  NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    activo         BIT           NOT NULL DEFAULT 1,
    fecha_creacion DATETIME      NOT NULL DEFAULT GETDATE(),
    ultimo_acceso  DATETIME      NULL,

    CONSTRAINT PK_USUARIO PRIMARY KEY (id_usuario),
    CONSTRAINT UQ_USUARIO_correo UNIQUE (correo),
    CONSTRAINT FK_USUARIO_ROL FOREIGN KEY (id_rol)
        REFERENCES tbRol (id_rol)
);

-- ============================================================
-- ESTUDIANTE
-- ============================================================
CREATE TABLE tbEstudiante (
    id_estudiante    INT          NOT NULL IDENTITY(1,1),
    id_usuario       INT          NOT NULL,
    id_carrera       INT          NOT NULL,
    carnet           VARCHAR(20)  NOT NULL,
    ciclo_actual     INT          NOT NULL DEFAULT 1 CHECK (ciclo_actual BETWEEN 1 AND 12),
    estado_academico VARCHAR(30)  NOT NULL DEFAULT 'Activo'
                     CHECK (estado_academico IN ('Activo', 'Suspendido', 'Graduado', 'Retirado')),
    fecha_ingreso    DATE         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_ESTUDIANTE PRIMARY KEY (id_estudiante),
    CONSTRAINT UQ_ESTUDIANTE_carnet UNIQUE (carnet),
    CONSTRAINT UQ_ESTUDIANTE_usuario UNIQUE (id_usuario),
    CONSTRAINT FK_ESTUDIANTE_USUARIO FOREIGN KEY (id_usuario)
        REFERENCES tbUsuario (id_usuario),
    CONSTRAINT FK_ESTUDIANTE_CARRERA FOREIGN KEY (id_carrera)
        REFERENCES tbCarrera (id_carrera)
);

-- ============================================================
-- DOCENTE
-- ============================================================
CREATE TABLE tbDocente (
    id_docente      INT          NOT NULL IDENTITY(1,1),
    id_usuario      INT          NOT NULL,
    especialidad    VARCHAR(150) NULL,
    grado_academico VARCHAR(50)  NOT NULL
                    CHECK (grado_academico IN ('Licenciatura', 'Maestría', 'Doctorado', 'Técnico')),
    disponible      BIT          NOT NULL DEFAULT 1,

    CONSTRAINT PK_DOCENTE PRIMARY KEY (id_docente),
    CONSTRAINT UQ_DOCENTE_usuario UNIQUE (id_usuario),
    CONSTRAINT FK_DOCENTE_USUARIO FOREIGN KEY (id_usuario)
        REFERENCES tbUsuario (id_usuario)
);

-- ============================================================
-- CURSO
-- ============================================================
CREATE TABLE tbCurso (
    id_curso        INT          NOT NULL IDENTITY(1,1),
    id_carrera      INT          NOT NULL,
    codigo          VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    creditos        INT          NOT NULL CHECK (creditos BETWEEN 1 AND 12),
    ciclo_requerido INT          NOT NULL CHECK (ciclo_requerido BETWEEN 1 AND 12),
    activo          BIT          NOT NULL DEFAULT 1,

    CONSTRAINT PK_CURSO PRIMARY KEY (id_curso),
    CONSTRAINT UQ_CURSO_codigo UNIQUE (codigo),
    CONSTRAINT FK_CURSO_CARRERA FOREIGN KEY (id_carrera)
        REFERENCES tbCarrera (id_carrera)
);

-- ============================================================
-- SECCION
-- ============================================================
CREATE TABLE tbSeccion (
    id_seccion     INT          NOT NULL IDENTITY(1,1),
    id_curso       INT          NOT NULL,
    id_docente     INT          NOT NULL,
    id_periodo     INT          NOT NULL,
    codigo_seccion VARCHAR(20)  NOT NULL,
    cupo_maximo    INT          NOT NULL DEFAULT 30 CHECK (cupo_maximo > 0),
    horario        VARCHAR(100) NULL,
    salon          VARCHAR(50)  NULL,
    estado         VARCHAR(20)  NOT NULL DEFAULT 'Abierta'
                   CHECK (estado IN ('Abierta', 'Cerrada', 'Cancelada', 'Finalizada')),

    CONSTRAINT PK_SECCION PRIMARY KEY (id_seccion),
    CONSTRAINT UQ_SECCION_codigo_periodo UNIQUE (codigo_seccion, id_periodo),
    CONSTRAINT FK_SECCION_CURSO FOREIGN KEY (id_curso)
        REFERENCES tbCurso (id_curso),
    CONSTRAINT FK_SECCION_DOCENTE FOREIGN KEY (id_docente)
        REFERENCES tbDocente (id_docente),
    CONSTRAINT FK_SECCION_PERIODO FOREIGN KEY (id_periodo)
        REFERENCES tbPeriodoAcademico (id_periodo)
);

-- ============================================================
-- ACTIVIDAD EVALUACION
-- ============================================================
CREATE TABLE tbActividadEvaluacion (
    id_actividad  INT           NOT NULL IDENTITY(1,1),
    id_seccion    INT           NOT NULL,
    nombre        VARCHAR(150)  NOT NULL,
    tipo          VARCHAR(30)   NOT NULL
                  CHECK (tipo IN ('Parcial', 'Final', 'Tarea', 'Proyecto', 'Quiz', 'Laboratorio')),
    ponderacion   DECIMAL(5,2)  NOT NULL CHECK (ponderacion > 0 AND ponderacion <= 100),
    fecha_entrega DATE          NULL,

    CONSTRAINT PK_ACTIVIDAD_EVALUACION PRIMARY KEY (id_actividad),
    CONSTRAINT FK_ACTIVIDAD_SECCION FOREIGN KEY (id_seccion)
        REFERENCES tbSeccion (id_seccion)
);

-- ============================================================
-- ASIGNACION
-- ============================================================
CREATE TABLE tbAsignacion (
    id_asignacion    INT          NOT NULL IDENTITY(1,1),
    id_seccion       INT          NOT NULL,
    id_estudiante    INT          NOT NULL,
    fecha_asignacion DATETIME     NOT NULL DEFAULT GETDATE(),
    estado           VARCHAR(20)  NOT NULL DEFAULT 'Activa'
                     CHECK (estado IN ('Activa', 'Retirada', 'Aprobada', 'Reprobada')),

    CONSTRAINT PK_ASIGNACION PRIMARY KEY (id_asignacion),
    CONSTRAINT UQ_ASIGNACION_seccion_estudiante UNIQUE (id_seccion, id_estudiante),
    CONSTRAINT FK_ASIGNACION_SECCION FOREIGN KEY (id_seccion)
        REFERENCES tbSeccion (id_seccion),
    CONSTRAINT FK_ASIGNACION_ESTUDIANTE FOREIGN KEY (id_estudiante)
        REFERENCES tbEstudiante (id_estudiante)
);

-- ============================================================
-- NOTA
-- ============================================================
CREATE TABLE tbNota (
    id_nota        INT           NOT NULL IDENTITY(1,1),
    id_asignacion  INT           NOT NULL,
    id_actividad   INT           NOT NULL,
    calificacion   DECIMAL(5,2)  NOT NULL CHECK (calificacion BETWEEN 0 AND 100),
    fecha_registro DATETIME      NOT NULL DEFAULT GETDATE(),
    observaciones  VARCHAR(500)  NULL,

    CONSTRAINT PK_NOTA PRIMARY KEY (id_nota),
    CONSTRAINT UQ_NOTA_asignacion_actividad UNIQUE (id_asignacion, id_actividad),
    CONSTRAINT FK_NOTA_ASIGNACION FOREIGN KEY (id_asignacion)
        REFERENCES tbAsignacion (id_asignacion),
    CONSTRAINT FK_NOTA_ACTIVIDAD FOREIGN KEY (id_actividad)
        REFERENCES tbActividadEvaluacion (id_actividad)
);

-- ============================================================
-- ASISTENCIA
-- ============================================================
CREATE TABLE tbAsistencia (
    id_asistencia INT          NOT NULL IDENTITY(1,1),
    id_asignacion INT          NOT NULL,
    fecha         DATE         NOT NULL,
    estado        VARCHAR(20)  NOT NULL
                  CHECK (estado IN ('Presente', 'Ausente', 'Justificado', 'Tardanza')),
    observaciones VARCHAR(300) NULL,

    CONSTRAINT PK_ASISTENCIA PRIMARY KEY (id_asistencia),
    CONSTRAINT UQ_ASISTENCIA_asignacion_fecha UNIQUE (id_asignacion, fecha),
    CONSTRAINT FK_ASISTENCIA_ASIGNACION FOREIGN KEY (id_asignacion)
        REFERENCES tbAsignacion (id_asignacion)
);

-- ============================================================
-- ALERTA_ACADEMICA
-- ============================================================
CREATE TABLE tbAlertaAcademica (
    id_alerta        INT          NOT NULL IDENTITY(1,1),
    id_estudiante    INT          NOT NULL,
    id_seccion       INT          NOT NULL,
    tipo_alerta      VARCHAR(50)  NOT NULL
                     CHECK (tipo_alerta IN ('Bajo rendimiento', 'Inasistencia', 'Reprobado', 'En riesgo')),
    descripcion      VARCHAR(500) NULL,
    fecha_generacion DATETIME     NOT NULL DEFAULT GETDATE(),
    resuelta         BIT          NOT NULL DEFAULT 0,

    CONSTRAINT PK_ALERTA_ACADEMICA PRIMARY KEY (id_alerta),
    CONSTRAINT FK_ALERTA_ESTUDIANTE FOREIGN KEY (id_estudiante)
        REFERENCES tbEstudiante (id_estudiante),
    CONSTRAINT FK_ALERTA_SECCION FOREIGN KEY (id_seccion)
        REFERENCES tbSeccion (id_seccion)
);

-- ============================================================
-- BITACORA AUDITORIA
-- ============================================================
CREATE TABLE tbBitacoraAuditoria (
    id_bitacora         INT           NOT NULL IDENTITY(1,1),
    id_usuario          INT           NULL,
    accion              VARCHAR(20)   NOT NULL
                        CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ERROR')),
    tabla_afectada      VARCHAR(100)  NULL,
    id_registro_afectado INT          NULL,
    datos_anteriores    NVARCHAR(MAX) NULL,
    datos_nuevos        NVARCHAR(MAX) NULL,
    fecha_hora          DATETIME      NOT NULL DEFAULT GETDATE(),
    ip_origen           VARCHAR(50)   NULL,

    CONSTRAINT PK_BITACORA PRIMARY KEY (id_bitacora),
    CONSTRAINT FK_BITACORA_USUARIO FOREIGN KEY (id_usuario)
        REFERENCES tbUsuario (id_usuario)
);