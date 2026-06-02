-- ============================================================
-- ÍNDICES para mejorar rendimiento en consultas frecuentes
-- ============================================================
USE dbUniPochinqui

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_USUARIO_correo' AND object_id = OBJECT_ID('tbUsuario'))
    CREATE INDEX IX_USUARIO_correo ON tbUsuario (correo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_USUARIO_rol' AND object_id = OBJECT_ID('tbUsuario'))
    CREATE INDEX IX_USUARIO_rol ON tbUsuario (id_rol);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ESTUDIANTE_carnet' AND object_id = OBJECT_ID('tbEstudiante'))
    CREATE INDEX IX_ESTUDIANTE_carnet ON tbEstudiante (carnet);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ESTUDIANTE_carrera' AND object_id = OBJECT_ID('tbEstudiante'))
    CREATE INDEX IX_ESTUDIANTE_carrera ON tbEstudiante (id_carrera);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SECCION_curso' AND object_id = OBJECT_ID('tbSeccion'))
    CREATE INDEX IX_SECCION_curso ON tbSeccion (id_curso);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SECCION_docente' AND object_id = OBJECT_ID('tbSeccion'))
    CREATE INDEX IX_SECCION_docente ON tbSeccion (id_docente);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SECCION_periodo' AND object_id = OBJECT_ID('tbSeccion'))
    CREATE INDEX IX_SECCION_periodo ON tbSeccion (id_periodo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASIGNACION_estudiante' AND object_id = OBJECT_ID('tbAsignacion'))
    CREATE INDEX IX_ASIGNACION_estudiante ON tbAsignacion (id_estudiante);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASIGNACION_seccion' AND object_id = OBJECT_ID('tbAsignacion'))
    CREATE INDEX IX_ASIGNACION_seccion ON tbAsignacion (id_seccion);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NOTA_asignacion' AND object_id = OBJECT_ID('tbNota'))
    CREATE INDEX IX_NOTA_asignacion ON tbNota (id_asignacion);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASISTENCIA_asignacion' AND object_id = OBJECT_ID('tbAsistencia'))
    CREATE INDEX IX_ASISTENCIA_asignacion ON tbAsistencia (id_asignacion);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASISTENCIA_fecha' AND object_id = OBJECT_ID('tbAsistencia'))
    CREATE INDEX IX_ASISTENCIA_fecha ON tbAsistencia (fecha);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ALERTA_estudiante' AND object_id = OBJECT_ID('tbAlertaAcademica'))
    CREATE INDEX IX_ALERTA_estudiante ON tbAlertaAcademica (id_estudiante);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ALERTA_resuelta' AND object_id = OBJECT_ID('tbAlertaAcademica'))
    CREATE INDEX IX_ALERTA_resuelta ON tbAlertaAcademica (resuelta);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BITACORA_usuario' AND object_id = OBJECT_ID('tbBitacoraAuditoria'))
    CREATE INDEX IX_BITACORA_usuario ON tbBitacoraAuditoria (id_usuario);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BITACORA_fecha' AND object_id = OBJECT_ID('tbBitacoraAuditoria'))
    CREATE INDEX IX_BITACORA_fecha ON tbBitacoraAuditoria (fecha_hora);

IF OBJECT_ID('tbMonitoreoConsulta', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MONITOREO_CONSULTA_fecha' AND object_id = OBJECT_ID('tbMonitoreoConsulta'))
        CREATE INDEX IX_MONITOREO_CONSULTA_fecha ON tbMonitoreoConsulta (fecha_inicio DESC);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MONITOREO_CONSULTA_duracion' AND object_id = OBJECT_ID('tbMonitoreoConsulta'))
        CREATE INDEX IX_MONITOREO_CONSULTA_duracion ON tbMonitoreoConsulta (duracion_ms DESC);
END