-- ============================================================
-- ÍNDICES para mejorar rendimiento en consultas frecuentes
-- ============================================================
USE dbUniPochinqui

CREATE INDEX IX_USUARIO_correo         ON tbUsuario (correo);
CREATE INDEX IX_USUARIO_rol            ON tbUsuario (id_rol);
CREATE INDEX IX_ESTUDIANTE_carnet      ON tbEstudiante (carnet);
CREATE INDEX IX_ESTUDIANTE_carrera     ON tbEstudiante (id_carrera);
CREATE INDEX IX_SECCION_curso          ON tbSeccion (id_curso);
CREATE INDEX IX_SECCION_docente        ON tbSeccion (id_docente);
CREATE INDEX IX_SECCION_periodo        ON tbSeccion (id_periodo);
CREATE INDEX IX_ASIGNACION_estudiante  ON tbAsignacion (id_estudiante);
CREATE INDEX IX_ASIGNACION_seccion     ON tbAsignacion (id_seccion);
CREATE INDEX IX_NOTA_asignacion        ON tbNota (id_asignacion);
CREATE INDEX IX_ASISTENCIA_asignacion  ON tbAsistencia (id_asignacion);
CREATE INDEX IX_ASISTENCIA_fecha       ON tbAsistencia (fecha);
CREATE INDEX IX_ALERTA_estudiante      ON tbAlertaAcademica (id_estudiante);
CREATE INDEX IX_BITACORA_usuario       ON tbBitacoraAuditoria (id_usuario);
CREATE INDEX IX_BITACORA_fecha         ON tbBitacoraAuditoria (fecha_hora);