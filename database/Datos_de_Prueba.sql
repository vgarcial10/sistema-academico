-- ============================================================
-- DATOS DE PRUEBA - dbUniPochinqui  (VERSION FINAL)
-- Sin GO intermedios que borren variables.
-- Todo el bloque con variables corre junto.
-- Seguro de re-ejecutar.
-- ============================================================
USE dbUniPochinqui;
GO

-- ====== LIMPIEZA TOTAL ======
DELETE FROM tbBitacoraAuditoria;
DELETE FROM tbAlertaAcademica;
DELETE FROM tbAsistencia;
DELETE FROM tbNota;
DELETE FROM tbAsignacion;
DELETE FROM tbActividadEvaluacion;
DELETE FROM tbSeccion;
DELETE FROM tbCurso;
DELETE FROM tbDocente;
DELETE FROM tbEstudiante;
DELETE FROM tbUsuario;
DELETE FROM tbPeriodoAcademico;
DELETE FROM tbCarrera;
DELETE FROM tbRol;
GO

-- ====== CATALOGOS BASE (sin variables) ======
INSERT INTO tbRol (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Docente',       'Gestiona notas y asistencia de sus secciones'),
('Estudiante',    'Consulta sus notas, asistencia y perfil'),
('Reportes',      'Solo lectura para generar reportes');

INSERT INTO tbCarrera (nombre, descripcion, creditos_totales, activa) VALUES
('Ingenieria en Sistemas', 'Desarrollo de software e infraestructura', 240, 1),
('Administracion de Empresas', 'Gestion y direccion empresarial', 200, 1),
('Contaduria Publica', 'Contabilidad y auditoria', 210, 1);

INSERT INTO tbPeriodoAcademico (nombre, fecha_inicio, fecha_fin, activo) VALUES
('Primer Semestre 2026', '2026-01-15', '2026-05-30', 1),
('Segundo Semestre 2026', '2026-07-15', '2026-11-30', 0);
GO

-- ====== USUARIOS (un solo bloque, sin GO en medio) ======
DECLARE @rolAdmin INT = (SELECT id_rol FROM tbRol WHERE nombre='Administrador');
DECLARE @rolDoc   INT = (SELECT id_rol FROM tbRol WHERE nombre='Docente');
DECLARE @rolEst   INT = (SELECT id_rol FROM tbRol WHERE nombre='Estudiante');
DECLARE @rolRep   INT = (SELECT id_rol FROM tbRol WHERE nombre='Reportes');

EXEC sp_RegisUsuario @id_rol=@rolAdmin, @nombre='Victor',  @apellido='Garcia',    @correo='admin@miumg.edu.gt',     @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolDoc,   @nombre='Maria',   @apellido='Lopez',     @correo='mlopez@miumg.edu.gt',    @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolDoc,   @nombre='Carlos',  @apellido='Ramirez',   @correo='cramirez@miumg.edu.gt',  @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolEst,   @nombre='Ana',     @apellido='Morales',   @correo='amorales@miumg.edu.gt',  @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolEst,   @nombre='Luis',    @apellido='Perez',     @correo='lperez@miumg.edu.gt',    @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolEst,   @nombre='Sofia',   @apellido='Castillo',  @correo='scastillo@miumg.edu.gt', @contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolEst,   @nombre='Diego',   @apellido='Hernandez', @correo='dhernandez@miumg.edu.gt',@contrasena='clave123';
EXEC sp_RegisUsuario @id_rol=@rolRep,   @nombre='Elena',   @apellido='Vega',      @correo='evega@miumg.edu.gt',     @contrasena='clave123';
GO

-- ====== DOCENTES Y ESTUDIANTES (un solo bloque) ======
INSERT INTO tbDocente (id_usuario, especialidad, grado_academico, disponible)
SELECT id_usuario, 'Bases de Datos y Backend', 'Maestría', 1 FROM tbUsuario WHERE correo='mlopez@miumg.edu.gt'
UNION ALL
SELECT id_usuario, 'Redes y Sistemas Operativos', 'Licenciatura', 1 FROM tbUsuario WHERE correo='cramirez@miumg.edu.gt';

INSERT INTO tbEstudiante (id_usuario, id_carrera, carnet, ciclo_actual, estado_academico)
SELECT u.id_usuario, c.id_carrera, '2026-IS-001', 4, 'Activo' FROM tbUsuario u, tbCarrera c WHERE u.correo='amorales@miumg.edu.gt'  AND c.nombre='Ingenieria en Sistemas'
UNION ALL
SELECT u.id_usuario, c.id_carrera, '2026-IS-002', 4, 'Activo' FROM tbUsuario u, tbCarrera c WHERE u.correo='lperez@miumg.edu.gt'    AND c.nombre='Ingenieria en Sistemas'
UNION ALL
SELECT u.id_usuario, c.id_carrera, '2026-AE-001', 3, 'Activo' FROM tbUsuario u, tbCarrera c WHERE u.correo='scastillo@miumg.edu.gt' AND c.nombre='Administracion de Empresas'
UNION ALL
SELECT u.id_usuario, c.id_carrera, '2026-IS-003', 2, 'Activo' FROM tbUsuario u, tbCarrera c WHERE u.correo='dhernandez@miumg.edu.gt'AND c.nombre='Ingenieria en Sistemas';
GO

-- ====== CURSOS (un solo bloque) ======
DECLARE @carIS INT = (SELECT id_carrera FROM tbCarrera WHERE nombre='Ingenieria en Sistemas');
DECLARE @carAE INT = (SELECT id_carrera FROM tbCarrera WHERE nombre='Administracion de Empresas');

INSERT INTO tbCurso (id_carrera, codigo, nombre, creditos, ciclo_requerido, activo) VALUES
(@carIS, 'IS-401', 'Base de Datos II',        5, 4, 1),
(@carIS, 'IS-402', 'Programacion Web',        5, 4, 1),
(@carIS, 'IS-201', 'Estructuras de Datos',    4, 2, 1),
(@carAE, 'AE-301', 'Contabilidad Gerencial',  4, 3, 1);
GO

-- ====== SECCIONES (un solo bloque) ======
DECLARE @per1 INT = (SELECT id_periodo FROM tbPeriodoAcademico WHERE nombre='Primer Semestre 2026');
DECLARE @docMaria  INT = (SELECT d.id_docente FROM tbDocente d JOIN tbUsuario u ON u.id_usuario=d.id_usuario WHERE u.correo='mlopez@miumg.edu.gt');
DECLARE @docCarlos INT = (SELECT d.id_docente FROM tbDocente d JOIN tbUsuario u ON u.id_usuario=d.id_usuario WHERE u.correo='cramirez@miumg.edu.gt');

INSERT INTO tbSeccion (id_curso, id_docente, id_periodo, codigo_seccion, cupo_maximo, horario, salon, estado)
SELECT id_curso, @docMaria,  @per1, 'BD2-A', 30, 'Lun-Mie 18:00-19:30', 'Lab 301', 'Abierta' FROM tbCurso WHERE codigo='IS-401'
UNION ALL
SELECT id_curso, @docMaria,  @per1, 'WEB-A', 25, 'Mar-Jue 18:00-19:30', 'Lab 302', 'Abierta' FROM tbCurso WHERE codigo='IS-402'
UNION ALL
SELECT id_curso, @docCarlos, @per1, 'ED-A',  35, 'Lun-Mie 16:00-17:30', 'Aula 105','Abierta' FROM tbCurso WHERE codigo='IS-201'
UNION ALL
SELECT id_curso, @docCarlos, @per1, 'CG-A',  30, 'Vie 18:00-21:00',     'Aula 210','Abierta' FROM tbCurso WHERE codigo='AE-301';
GO

-- ====== ACTIVIDADES (un solo bloque) ======
DECLARE @secBD2 INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='BD2-A');
DECLARE @secWEB INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='WEB-A');
DECLARE @secED  INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='ED-A');

INSERT INTO tbActividadEvaluacion (id_seccion, nombre, tipo, ponderacion, fecha_entrega) VALUES
(@secBD2, 'Primer Parcial',   'Parcial',     25.00, '2026-03-01'),
(@secBD2, 'Segundo Parcial',  'Parcial',     25.00, '2026-04-01'),
(@secBD2, 'Proyecto Final',   'Proyecto',    30.00, '2026-05-15'),
(@secBD2, 'Laboratorios',     'Laboratorio', 20.00, '2026-05-20'),
(@secWEB, 'Parcial Unico',    'Parcial',     40.00, '2026-03-15'),
(@secWEB, 'Proyecto Web',     'Proyecto',    60.00, '2026-05-15'),
(@secED,  'Examen Final',     'Final',       50.00, '2026-05-25'),
(@secED,  'Tareas',           'Tarea',       50.00, '2026-05-10');
GO

-- ====== ASIGNACIONES via SP (un solo bloque) ======
DECLARE @secBD2 INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='BD2-A');
DECLARE @secWEB INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='WEB-A');
DECLARE @secCG  INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='CG-A');
DECLARE @estAna   INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='amorales@miumg.edu.gt');
DECLARE @estLuis  INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='lperez@miumg.edu.gt');
DECLARE @estSofia INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='scastillo@miumg.edu.gt');
DECLARE @estDiego INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='dhernandez@miumg.edu.gt');
DECLARE @admin INT = (SELECT id_usuario FROM tbUsuario WHERE correo='admin@miumg.edu.gt');

EXEC sp_AsignarEstudiante @id_seccion=@secBD2, @id_estudiante=@estAna,   @id_usuario_op=@admin;
EXEC sp_AsignarEstudiante @id_seccion=@secBD2, @id_estudiante=@estLuis,  @id_usuario_op=@admin;
EXEC sp_AsignarEstudiante @id_seccion=@secBD2, @id_estudiante=@estDiego, @id_usuario_op=@admin;
EXEC sp_AsignarEstudiante @id_seccion=@secWEB, @id_estudiante=@estAna,   @id_usuario_op=@admin;
EXEC sp_AsignarEstudiante @id_seccion=@secWEB, @id_estudiante=@estLuis,  @id_usuario_op=@admin;
EXEC sp_AsignarEstudiante @id_seccion=@secCG,  @id_estudiante=@estSofia, @id_usuario_op=@admin;
GO

-- ====== NOTAS via SP (un solo bloque) ======
DECLARE @secBD2 INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='BD2-A');
DECLARE @estAna   INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='amorales@miumg.edu.gt');
DECLARE @estLuis  INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='lperez@miumg.edu.gt');
DECLARE @estDiego INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='dhernandez@miumg.edu.gt');
DECLARE @doc INT = (SELECT id_usuario FROM tbUsuario WHERE correo='mlopez@miumg.edu.gt');
DECLARE @asigAna   INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estAna);
DECLARE @asigLuis  INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estLuis);
DECLARE @asigDiego INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estDiego);
DECLARE @act1 INT = (SELECT id_actividad FROM tbActividadEvaluacion WHERE id_seccion=@secBD2 AND nombre='Primer Parcial');
DECLARE @act2 INT = (SELECT id_actividad FROM tbActividadEvaluacion WHERE id_seccion=@secBD2 AND nombre='Segundo Parcial');
DECLARE @act3 INT = (SELECT id_actividad FROM tbActividadEvaluacion WHERE id_seccion=@secBD2 AND nombre='Proyecto Final');

EXEC sp_RegistrarNota @id_asignacion=@asigAna,   @id_actividad=@act1, @calificacion=85, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigAna,   @id_actividad=@act2, @calificacion=90, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigAna,   @id_actividad=@act3, @calificacion=88, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigLuis,  @id_actividad=@act1, @calificacion=70, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigLuis,  @id_actividad=@act2, @calificacion=65, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigDiego, @id_actividad=@act1, @calificacion=45, @id_usuario_op=@doc;
EXEC sp_RegistrarNota @id_asignacion=@asigDiego, @id_actividad=@act2, @calificacion=50, @id_usuario_op=@doc;
GO

-- ====== ASISTENCIA via SP (un solo bloque) ======
DECLARE @secBD2 INT = (SELECT id_seccion FROM tbSeccion WHERE codigo_seccion='BD2-A');
DECLARE @estAna   INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='amorales@miumg.edu.gt');
DECLARE @estLuis  INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='lperez@miumg.edu.gt');
DECLARE @estDiego INT = (SELECT e.id_estudiante FROM tbEstudiante e JOIN tbUsuario u ON u.id_usuario=e.id_usuario WHERE u.correo='dhernandez@miumg.edu.gt');
DECLARE @doc INT = (SELECT id_usuario FROM tbUsuario WHERE correo='mlopez@miumg.edu.gt');
DECLARE @asigAna   INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estAna);
DECLARE @asigLuis  INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estLuis);
DECLARE @asigDiego INT = (SELECT id_asignacion FROM tbAsignacion WHERE id_seccion=@secBD2 AND id_estudiante=@estDiego);

EXEC sp_RegistrarAsistencia @id_asignacion=@asigAna,   @fecha='2026-02-02', @estado='Presente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigAna,   @fecha='2026-02-04', @estado='Presente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigAna,   @fecha='2026-02-09', @estado='Presente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigLuis,  @fecha='2026-02-02', @estado='Presente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigLuis,  @fecha='2026-02-04', @estado='Ausente',  @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigLuis,  @fecha='2026-02-09', @estado='Presente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigDiego, @fecha='2026-02-02', @estado='Ausente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigDiego, @fecha='2026-02-04', @estado='Ausente', @id_usuario_op=@doc;
EXEC sp_RegistrarAsistencia @id_asignacion=@asigDiego, @fecha='2026-02-09', @estado='Presente', @id_usuario_op=@doc;
GO

-- ====== VERIFICACION ======
SELECT 'Roles'        AS tabla, COUNT(*) AS total FROM tbRol
UNION ALL SELECT 'Carreras',     COUNT(*) FROM tbCarrera
UNION ALL SELECT 'Periodos',     COUNT(*) FROM tbPeriodoAcademico
UNION ALL SELECT 'Usuarios',     COUNT(*) FROM tbUsuario
UNION ALL SELECT 'Docentes',     COUNT(*) FROM tbDocente
UNION ALL SELECT 'Estudiantes',  COUNT(*) FROM tbEstudiante
UNION ALL SELECT 'Cursos',       COUNT(*) FROM tbCurso
UNION ALL SELECT 'Secciones',    COUNT(*) FROM tbSeccion
UNION ALL SELECT 'Actividades',  COUNT(*) FROM tbActividadEvaluacion
UNION ALL SELECT 'Asignaciones', COUNT(*) FROM tbAsignacion
UNION ALL SELECT 'Notas',        COUNT(*) FROM tbNota
UNION ALL SELECT 'Asistencias',  COUNT(*) FROM tbAsistencia
UNION ALL SELECT 'Alertas',      COUNT(*) FROM tbAlertaAcademica
UNION ALL SELECT 'Bitacora',     COUNT(*) FROM tbBitacoraAuditoria;
GO
