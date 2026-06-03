USE dbUniPochinqui;
GO


-- ============================================================
-- ASIGNAR ESTUDIANTE A SECCIÓN
-- ============================================================
CREATE OR ALTER PROCEDURE sp_AsignarEstudiante
    @id_seccion    INT,
    @id_estudiante INT,
    @id_usuario_op INT = NULL   -- usuario que realiza la operación
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Validar que la sección exista y esté abierta
        IF NOT EXISTS (SELECT 1 FROM tbSeccion WHERE id_seccion = @id_seccion AND estado = 'Abierta')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La sección no existe o no está abierta' AS mensaje;
            RETURN;
        END

        -- Validar que el estudiante esté activo
        IF NOT EXISTS (SELECT 1 FROM tbEstudiante WHERE id_estudiante = @id_estudiante AND estado_academico = 'Activo')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'El estudiante no está activo' AS mensaje;
            RETURN;
        END

        -- Validar duplicado
        IF EXISTS (SELECT 1 FROM tbAsignacion
                   WHERE id_seccion = @id_seccion AND id_estudiante = @id_estudiante)
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'El estudiante ya está asignado a esta sección' AS mensaje;
            RETURN;
        END

        -- Validar cupo disponible
        DECLARE @cupo_max INT, @inscritos INT;
        SELECT @cupo_max = cupo_maximo FROM tbSeccion WHERE id_seccion = @id_seccion;
        SELECT @inscritos = COUNT(*) FROM tbAsignacion
        WHERE id_seccion = @id_seccion AND estado = 'Activa';

        IF @inscritos >= @cupo_max
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito,
                   CONCAT('Sección sin cupo. Máximo: ', @cupo_max, ', Inscritos: ', @inscritos) AS mensaje;
            RETURN;
        END

        -- Insertar asignación
        DECLARE @id_nueva INT;
        INSERT INTO tbAsignacion(id_seccion, id_estudiante, estado)
        VALUES (@id_seccion, @id_estudiante, 'Activa');
        SET @id_nueva = SCOPE_IDENTITY();

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES
            (@id_usuario_op, 'INSERT', 'ASIGNACION', @id_nueva,
             CONCAT('{"id_seccion":', @id_seccion, ',"id_estudiante":', @id_estudiante, '}'));

        COMMIT;
        SELECT 1 AS exito, 'Estudiante asignado correctamente' AS mensaje, @id_nueva AS id_asignacion;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (@id_usuario_op, 'ERROR', 'ASIGNACION',
                CONCAT('{"error":"', ERROR_MESSAGE(), '"}'));
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- CREAR ACTIVIDAD DE EVALUACIÓN (por sección)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CrearActividadEvaluacion
    @id_seccion      INT,
    @nombre          VARCHAR(150),
    @tipo            VARCHAR(30),
    @ponderacion     DECIMAL(5,2),
    @fecha_entrega   DATE = NULL,
    @id_usuario_op   INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM tbSeccion WHERE id_seccion = @id_seccion AND estado = 'Abierta')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La sección no existe o no está abierta' AS mensaje;
            RETURN;
        END

        IF @tipo NOT IN ('Parcial', 'Final', 'Tarea', 'Proyecto', 'Quiz', 'Laboratorio')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'Tipo de actividad no válido' AS mensaje;
            RETURN;
        END

        IF @ponderacion <= 0 OR @ponderacion > 100
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La ponderación debe estar entre 0.01 y 100' AS mensaje;
            RETURN;
        END

        IF LTRIM(RTRIM(ISNULL(@nombre, ''))) = ''
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'El nombre de la actividad es obligatorio' AS mensaje;
            RETURN;
        END

        -- Docente solo en sus secciones; Administrador en cualquiera
        IF NOT EXISTS (
            SELECT 1 FROM tbUsuario u
            INNER JOIN tbRol r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = @id_usuario_op AND r.nombre = 'Administrador'
        )
        AND NOT EXISTS (
            SELECT 1 FROM tbSeccion s
            INNER JOIN tbDocente d ON d.id_docente = s.id_docente
            WHERE s.id_seccion = @id_seccion AND d.id_usuario = @id_usuario_op
        )
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'No tiene permiso para crear actividades en esta sección' AS mensaje;
            RETURN;
        END

        DECLARE @id_nueva INT;
        INSERT INTO tbActividadEvaluacion (id_seccion, nombre, tipo, ponderacion, fecha_entrega)
        VALUES (@id_seccion, LTRIM(RTRIM(@nombre)), @tipo, @ponderacion, @fecha_entrega);
        SET @id_nueva = SCOPE_IDENTITY();

        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES
            (@id_usuario_op, 'INSERT', 'ACTIVIDAD_EVALUACION', @id_nueva,
             CONCAT('{"id_seccion":', @id_seccion, ',"tipo":"', @tipo, '","ponderacion":', @ponderacion, '}'));

        COMMIT;
        SELECT 1 AS exito, 'Actividad creada correctamente' AS mensaje, @id_nueva AS id_actividad;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (@id_usuario_op, 'ERROR', 'ACTIVIDAD_EVALUACION',
                CONCAT('{"error":"', ERROR_MESSAGE(), '"}'));
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- REGISTRAR / ACTUALIZAR NOTA
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RegistrarNota
    @id_asignacion INT,
    @id_actividad  INT,
    @calificacion  DECIMAL(5,2),
    @observaciones VARCHAR(500) = NULL,
    @id_usuario_op INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Validar rango
        IF @calificacion < 0 OR @calificacion > 100
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La calificación debe estar entre 0 y 100' AS mensaje;
            RETURN;
        END

        -- Validar que la asignación esté activa
        IF NOT EXISTS (SELECT 1 FROM tbAsignacion WHERE id_asignacion = @id_asignacion AND estado = 'Activa')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La asignación no existe o no está activa' AS mensaje;
            RETURN;
        END

        -- Validar que la actividad pertenece a la sección de esa asignación
        IF NOT EXISTS (
            SELECT 1
            FROM tbActividadEvaluacion ae
            INNER JOIN tbAsignacion asig ON asig.id_seccion = ae.id_seccion
            WHERE ae.id_actividad = @id_actividad
              AND asig.id_asignacion = @id_asignacion
        )
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La actividad no pertenece a la sección del estudiante' AS mensaje;
            RETURN;
        END

        DECLARE @accion VARCHAR(10), @datos_ant NVARCHAR(MAX), @id_nota INT;

        IF EXISTS (SELECT 1 FROM tbNota WHERE id_asignacion = @id_asignacion AND id_actividad = @id_actividad)
        BEGIN
            -- Guardar valor anterior para auditoría
            SELECT @datos_ant = CONCAT('{"calificacion":', calificacion, '}')
            FROM tbNota
            WHERE id_asignacion = @id_asignacion AND id_actividad = @id_actividad;

            UPDATE tbNota
            SET calificacion   = @calificacion,
                observaciones  = @observaciones,
                fecha_registro = GETDATE()
            WHERE id_asignacion = @id_asignacion AND id_actividad = @id_actividad;

            SELECT @id_nota = id_nota
            FROM tbNota WHERE id_asignacion = @id_asignacion AND id_actividad = @id_actividad;

            SET @accion = 'UPDATE';
        END
        ELSE
        BEGIN
            INSERT INTO tbNota(id_asignacion, id_actividad, calificacion, observaciones)
            VALUES (@id_asignacion, @id_actividad, @calificacion, @observaciones);
            SET @id_nota = SCOPE_IDENTITY();
            SET @accion  = 'INSERT';
            SET @datos_ant = NULL;
        END

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        VALUES
            (@id_usuario_op, @accion, 'NOTA', @id_nota, @datos_ant,
             CONCAT('{"calificacion":', @calificacion, ',"id_asignacion":', @id_asignacion,
                    ',"id_actividad":', @id_actividad, '}'));

        -- Verificar si el estudiante entra en riesgo académico (promedio < 60)
        DECLARE @promedio DECIMAL(5,2);
        SELECT @promedio = AVG(n.calificacion)
        FROM tbNota n
        WHERE n.id_asignacion = @id_asignacion;

        IF @promedio < 60
        BEGIN
            DECLARE @id_est INT, @id_sec INT;
            SELECT @id_est = id_estudiante, @id_sec = id_seccion
            FROM tbAsignacion WHERE id_asignacion = @id_asignacion;

            IF NOT EXISTS (
                SELECT 1 FROM tbAlertaAcademica
                WHERE id_estudiante = @id_est AND id_seccion = @id_sec
                  AND tipo_alerta = 'En riesgo' AND resuelta = 0
            )
            INSERT INTO tbAlertaAcademica(id_estudiante, id_seccion, tipo_alerta, descripcion)
            VALUES (@id_est, @id_sec, 'En riesgo',
                    CONCAT('Promedio actual: ', CAST(@promedio AS VARCHAR(6)), '. Se requiere atención.'));
        END

        COMMIT;
        SELECT 1 AS exito,
               CONCAT(IIF(@accion='INSERT','Nota registrada','Nota actualizada'), ' correctamente') AS mensaje,
               @id_nota AS id_nota;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (@id_usuario_op, 'ERROR', 'NOTA', CONCAT('{"error":"', ERROR_MESSAGE(), '"}'));
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- REGISTRAR ASISTENCIA
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RegistrarAsistencia
    @id_asignacion INT,
    @fecha         DATE,
    @estado        VARCHAR(20),   -- Presente | Ausente | Justificado | Tardanza
    @observaciones VARCHAR(300) = NULL,
    @id_usuario_op INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Validar estado permitido
        IF @estado NOT IN ('Presente', 'Ausente', 'Justificado', 'Tardanza')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'Estado de asistencia no válido' AS mensaje;
            RETURN;
        END

        -- Validar que la asignación exista
        IF NOT EXISTS (SELECT 1 FROM tbAsignacion WHERE id_asignacion = @id_asignacion AND estado = 'Activa')
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'Asignación no encontrada o inactiva' AS mensaje;
            RETURN;
        END

        DECLARE @accion VARCHAR(10), @datos_ant NVARCHAR(MAX), @id_asist INT;

        IF EXISTS (SELECT 1 FROM tbAsistencia WHERE id_asignacion = @id_asignacion AND fecha = @fecha)
        BEGIN
            SELECT @datos_ant = CONCAT('{"estado":"', estado, '"}')
            FROM tbAsistencia WHERE id_asignacion = @id_asignacion AND fecha = @fecha;

            UPDATE tbAsistencia
            SET estado        = @estado,
                observaciones = @observaciones
            WHERE id_asignacion = @id_asignacion AND fecha = @fecha;

            SELECT @id_asist = id_asistencia
            FROM tbAsistencia WHERE id_asignacion = @id_asignacion AND fecha = @fecha;

            SET @accion = 'UPDATE';
        END
        ELSE
        BEGIN
            INSERT INTO tbAsistencia (id_asignacion, fecha, estado, observaciones)
            VALUES (@id_asignacion, @fecha, @estado, @observaciones);
            SET @id_asist  = SCOPE_IDENTITY();
            SET @accion    = 'INSERT';
            SET @datos_ant = NULL;
        END

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        VALUES
            (@id_usuario_op, @accion, 'ASISTENCIA', @id_asist, @datos_ant,
             CONCAT('{"id_asignacion":', @id_asignacion,
                    ',"fecha":"', CONVERT(VARCHAR, @fecha, 23),
                    '","estado":"', @estado, '"}'));

        -- Alerta por inasistencia excesiva (> 30% ausencias)
        DECLARE @total_clases  INT, @total_ausencias INT;
        SELECT @total_clases   = COUNT(*) FROM tbAsistencia WHERE id_asignacion = @id_asignacion;
        SELECT @total_ausencias = COUNT(*) FROM tbAsistencia
        WHERE id_asignacion = @id_asignacion AND estado = 'Ausente';

        IF @total_clases > 0 AND (CAST(@total_ausencias AS FLOAT) / @total_clases) > 0.30
        BEGIN
            DECLARE @id_est2 INT, @id_sec2 INT;
            SELECT @id_est2 = id_estudiante, @id_sec2 = id_seccion
            FROM tbAsignacion WHERE id_asignacion = @id_asignacion;

            IF NOT EXISTS (
                SELECT 1 FROM tbAlertaAcademica
                WHERE id_estudiante = @id_est2 AND id_seccion = @id_sec2
                  AND tipo_alerta = 'Inasistencia' AND resuelta = 0
            )
            INSERT INTO tbAlertaAcademica (id_estudiante, id_seccion, tipo_alerta, descripcion)
            VALUES (@id_est2, @id_sec2, 'Inasistencia',
                    CONCAT('Ausencias: ', @total_ausencias, ' de ', @total_clases, ' clases (',
                           CAST(CAST(@total_ausencias AS FLOAT)/@total_clases*100 AS INT), '%)'));
        END

        COMMIT;
        SELECT 1 AS exito, 'Asistencia registrada correctamente' AS mensaje, @id_asist AS id_asistencia;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (@id_usuario_op, 'ERROR', 'ASISTENCIA', CONCAT('{"error":"', ERROR_MESSAGE(), '"}'));
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- REGISTRAR ASISTENCIA MASIVA (lista de estudiantes)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RegistrarAsistenciaMasiva
    @id_seccion    INT,
    @fecha         DATE,
    @id_usuario_op INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Crear tabla temporal con los estudiantes de la sección
    CREATE TABLE #lista_asistencia (
        id_asignacion INT,
        estado        VARCHAR(20) DEFAULT 'Presente'
    );

    INSERT INTO #lista_asistencia (id_asignacion)
    SELECT id_asignacion FROM tbAsignacion
    WHERE id_seccion = @id_seccion AND estado = 'Activa';

    DECLARE @id_asig INT, @cnt INT = 0;

    DECLARE cur CURSOR FOR
        SELECT id_asignacion FROM #lista_asistencia;

    OPEN cur;
    FETCH NEXT FROM cur INTO @id_asig;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_RegistrarAsistencia
            @id_asignacion = @id_asig,
            @fecha         = @fecha,
            @estado        = 'Presente',
            @id_usuario_op = @id_usuario_op;
        SET @cnt = @cnt + 1;
        FETCH NEXT FROM cur INTO @id_asig;
    END;

    CLOSE cur;
    DEALLOCATE cur;
    DROP TABLE #lista_asistencia;

    SELECT 1 AS exito,
           CONCAT(@cnt, ' registros de asistencia procesados para la fecha ', CONVERT(VARCHAR, @fecha, 23)) AS mensaje;
END;
GO

-- ============================================================
-- OBTENER REPORTE DE NOTAS POR SECCIÓN
-- ============================================================
CREATE OR ALTER PROCEDURE sp_ReporteNotasSeccion
    @id_seccion INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.carnet,
        CONCAT(u.nombre, ' ', u.apellido)   AS estudiante,
        c.nombre                             AS curso,
        s.codigo_seccion,
        COUNT(n.id_nota)                     AS actividades_registradas,
        -- Promedio ponderado: suma(nota * ponderacion) / suma(ponderaciones con nota)
        CAST(
            SUM(n.calificacion * ae.ponderacion / 100.0)
            / NULLIF(SUM(ae.ponderacion / 100.0), 0)
        AS DECIMAL(5,2))                     AS promedio_ponderado,
        AVG(n.calificacion)                  AS promedio_simple,
        MIN(n.calificacion)                  AS nota_minima,
        MAX(n.calificacion)                  AS nota_maxima,
        CASE
            WHEN AVG(n.calificacion) >= 61 THEN 'Aprobado'
            WHEN AVG(n.calificacion) IS NULL THEN 'Sin notas'
            ELSE 'En riesgo'
        END                                  AS estado_academico
    FROM tbAsignacion asig
    INNER JOIN tbEstudiante e  ON e.id_estudiante = asig.id_estudiante
    INNER JOIN tbUsuario u     ON u.id_usuario    = e.id_usuario
    INNER JOIN tbSeccion s     ON s.id_seccion    = asig.id_seccion
    INNER JOIN tbCurso c       ON c.id_curso      = s.id_curso
    LEFT  JOIN tbNota n        ON n.id_asignacion = asig.id_asignacion
    LEFT  JOIN tbActividadEvaluacion ae ON ae.id_actividad = n.id_actividad
    WHERE asig.id_seccion = @id_seccion
    GROUP BY e.carnet, u.nombre, u.apellido, c.nombre, s.codigo_seccion
    ORDER BY promedio_ponderado DESC;
END;
GO

-- ============================================================
-- OBTENER REPORTE DE ASISTENCIA POR SECCIÓN
-- ============================================================
CREATE OR ALTER PROCEDURE sp_ReporteAsistenciaSeccion
    @id_seccion INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.carnet,
        CONCAT(u.nombre, ' ', u.apellido)  AS estudiante,
        COUNT(a.id_asistencia)             AS total_clases,
        SUM(CASE WHEN a.estado = 'Presente'    THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado = 'Ausente'     THEN 1 ELSE 0 END) AS ausentes,
        SUM(CASE WHEN a.estado = 'Justificado' THEN 1 ELSE 0 END) AS justificados,
        SUM(CASE WHEN a.estado = 'Tardanza'    THEN 1 ELSE 0 END) AS tardanzas,
        CAST(
            100.0 * SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END)
            / NULLIF(COUNT(a.id_asistencia), 0)
        AS DECIMAL(5,2))                   AS pct_asistencia,
        CASE
            WHEN COUNT(a.id_asistencia) = 0 THEN 'Sin registros'
            WHEN 100.0 * SUM(CASE WHEN a.estado = 'Ausente' THEN 1 ELSE 0 END)
                 / COUNT(a.id_asistencia) > 30 THEN 'ALERTA'
            ELSE 'Normal'
        END                                AS estado_asistencia
    FROM tbAsignacion asig
    INNER JOIN tbEstudiante e ON e.id_estudiante = asig.id_estudiante
    INNER JOIN tbUsuario u    ON u.id_usuario    = e.id_usuario
    LEFT  JOIN tbAsistencia a ON a.id_asignacion = asig.id_asignacion
    WHERE asig.id_seccion = @id_seccion
    GROUP BY e.carnet, u.nombre, u.apellido
    ORDER BY pct_asistencia;
END;
GO

-- ============================================================
-- CERRAR SECCIÓN Y ACTUALIZAR ESTADOS FINALES
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CerrarSeccion
    @id_seccion    INT,
    @id_usuario_op INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Marcar sección como Finalizada
        UPDATE tbSeccion SET estado = 'Finalizada' WHERE id_seccion = @id_seccion;

        -- Actualizar estado de cada asignación según su promedio
        UPDATE asig
        SET estado = CASE
            WHEN prom.promedio >= 61 THEN 'Aprobada'
            ELSE 'Reprobada'
        END
        FROM tbAsignacion asig
        INNER JOIN (
            SELECT
                n.id_asignacion,
                AVG(n.calificacion) AS promedio
            FROM tbNota n
            GROUP BY n.id_asignacion
        ) prom ON prom.id_asignacion = asig.id_asignacion
        WHERE asig.id_seccion = @id_seccion;

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES (@id_usuario_op, 'UPDATE', 'SECCION', @id_seccion,
                CONCAT('{"estado":"Finalizada","id_seccion":', @id_seccion, '}'));

        COMMIT;
        SELECT 1 AS exito, CONCAT('Sección ', @id_seccion, ' cerrada correctamente') AS mensaje;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- OBTENER PERFIL COMPLETO DEL ESTUDIANTE
-- ============================================================
CREATE OR ALTER PROCEDURE sp_PerfilEstudiante
    @id_estudiante INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Datos generales
    SELECT
        e.id_estudiante, e.carnet, e.ciclo_actual, e.estado_academico,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
        u.correo,
        car.nombre AS carrera,
        e.fecha_ingreso
    FROM tbEstudiante e
    INNER JOIN tbUsuario  u   ON u.id_usuario  = e.id_usuario
    INNER JOIN tbCarrera  car ON car.id_carrera = e.id_carrera
    WHERE e.id_estudiante = @id_estudiante;

    -- Secciones activas con promedio
    SELECT
        c.codigo, c.nombre AS curso,
        s.codigo_seccion, s.horario,
        CONCAT(ud.nombre, ' ', ud.apellido) AS docente,
        p.nombre AS periodo,
        CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio_actual,
        asig.estado AS estado_asignacion
    FROM tbAsignacion asig
    INNER JOIN tbSeccion  s   ON s.id_seccion  = asig.id_seccion
    INNER JOIN tbCurso    c   ON c.id_curso    = s.id_curso
    INNER JOIN tbDocente  d   ON d.id_docente  = s.id_docente
    INNER JOIN tbUsuario  ud  ON ud.id_usuario = d.id_usuario
    INNER JOIN tbPeriodoAcademico p ON p.id_periodo = s.id_periodo
    LEFT  JOIN tbNota     n   ON n.id_asignacion = asig.id_asignacion
    WHERE asig.id_estudiante = @id_estudiante
    GROUP BY c.codigo, c.nombre, s.codigo_seccion, s.horario,
             ud.nombre, ud.apellido, p.nombre, asig.estado;

    -- Alertas activas
    SELECT tipo_alerta, descripcion, fecha_generacion
    FROM tbAlertaAcademica
    WHERE id_estudiante = @id_estudiante AND resuelta = 0
ORDER BY fecha_generacion DESC;
END;
GO

-- ============================================================
-- Funcion para HASH
-- ============================================================
CREATE OR ALTER FUNCTION fn_HashContrasena(@contrasena VARCHAR(255))
RETURNS VARCHAR(255)
AS
BEGIN
    RETURN LOWER(CONVERT(VARCHAR(255),
                 HASHBYTES('SHA2_256', @contrasena), 2))
END;
GO

-- ============================================================
-- REGISTRAR USUARIO
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RegistrarUsuario
    @id_rol         INT,
    @nombre         VARCHAR(100),
    @apellido       VARCHAR(100),
    @correo         VARCHAR(150),
    @contrasena     VARCHAR(255),   -- texto plano, se hashea aquí
    @id_usuario_op  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Validar que el correo no esté registrado
        IF EXISTS (SELECT 1 FROM tbUsuario WHERE correo = @correo)
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'El correo ya está registrado' AS mensaje;
            RETURN;
        END

        -- Validar que el rol exista
        IF NOT EXISTS (SELECT 1 FROM tbRol WHERE id_rol = @id_rol)
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'El rol especificado no existe' AS mensaje;
            RETURN;
        END

        -- Validar longitud mínima de contraseña
        IF LEN(@contrasena) < 6
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La contraseña debe tener al menos 6 caracteres' AS mensaje;
            RETURN;
        END

        -- Hashear la contraseña con SHA2_256
        DECLARE @hash VARCHAR(255) = dbo.fn_HashContrasena(@contrasena);

        -- Insertar usuario con contraseña hasheada
        INSERT INTO tbUsuario (id_rol, nombre, apellido, correo, contrasena_hash, activo)
        VALUES (@id_rol, @nombre, @apellido, @correo, @hash, 1);

        DECLARE @id_nuevo INT = SCOPE_IDENTITY();

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES
            (@id_usuario_op, 'INSERT', 'USUARIO', @id_nuevo,
             CONCAT('{"correo":"', @correo, '","id_rol":', @id_rol,
                    ',"nombre":"', @nombre, ' ', @apellido, '"}'));

        COMMIT;
        SELECT
            1               AS exito,
            'Usuario registrado correctamente' AS mensaje,
            @id_nuevo       AS id_usuario,
            @correo         AS correo,
            @hash           AS hash_generado;  -- solo para verificar en desarrollo

    END TRY
    BEGIN CATCH
        ROLLBACK;
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (@id_usuario_op, 'ERROR', 'USUARIO',
                CONCAT('{"error":"', ERROR_MESSAGE(), '"}'));
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- CAMBIAR CONTRASEÑA
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CambiarContrasena
    @id_usuario     INT,
    @contrasena_actual  VARCHAR(255),  -- texto plano
    @contrasena_nueva   VARCHAR(255),  -- texto plano
    @id_usuario_op      INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Hashear la contraseña actual para verificarla
        DECLARE @hash_actual VARCHAR(255) = dbo.fn_HashContrasena(@contrasena_actual);

        -- Validar que la contraseña actual sea correcta
        IF NOT EXISTS (
            SELECT 1 FROM tbUsuario
            WHERE id_usuario = @id_usuario
              AND contrasena_hash = @hash_actual
              AND activo = 1
        )
        BEGIN
            ROLLBACK;
            -- Registrar intento fallido
            INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
            VALUES (@id_usuario, 'ERROR', 'USUARIO',
                    '{"motivo":"Contraseña actual incorrecta al intentar cambio"}');
            SELECT 0 AS exito, 'La contraseña actual es incorrecta' AS mensaje;
            RETURN;
        END

        -- Validar longitud mínima de nueva contraseña
        IF LEN(@contrasena_nueva) < 6
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La nueva contraseña debe tener al menos 6 caracteres' AS mensaje;
            RETURN;
        END

        -- Validar que la nueva no sea igual a la actual
        DECLARE @hash_nuevo VARCHAR(255) = dbo.fn_HashContrasena(@contrasena_nueva);

        IF @hash_actual = @hash_nuevo
        BEGIN
            ROLLBACK;
            SELECT 0 AS exito, 'La nueva contraseña debe ser diferente a la actual' AS mensaje;
            RETURN;
        END

        -- Actualizar contraseña
        UPDATE tbUsuario
        SET contrasena_hash = @hash_nuevo
        WHERE id_usuario = @id_usuario;

        -- Bitácora
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado,
             datos_anteriores, datos_nuevos)
        VALUES
            (@id_usuario_op, 'UPDATE', 'USUARIO', @id_usuario,
             '{"campo":"contrasena_hash","valor":"[PROTEGIDO]"}',
             '{"campo":"contrasena_hash","valor":"[ACTUALIZADO]"}');

        COMMIT;
        SELECT 1 AS exito, 'Contraseña actualizada correctamente' AS mensaje;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje;
    END CATCH;
END;
GO

-- ============================================================
-- LOGIN ACTUALIZADO
-- ============================================================
CREATE OR ALTER PROCEDURE sp_Login
    @correo         VARCHAR(150),
    @contrasena     VARCHAR(255)    -- texto plano, se hashea aquí
AS
BEGIN
    SET NOCOUNT ON;

    -- Hashear la contraseña recibida
    DECLARE @hash VARCHAR(255) = dbo.fn_HashContrasena(@contrasena);

    DECLARE @id_usuario INT, @activo BIT, @id_rol INT;

    SELECT
        @id_usuario = id_usuario,
        @activo     = activo,
        @id_rol     = id_rol
    FROM tbUsuario
    WHERE correo        = @correo
      AND contrasena_hash = @hash;    -- compara hash contra hash

    IF @id_usuario IS NULL
    BEGIN
        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, datos_nuevos)
        VALUES (NULL, 'ERROR', 'USUARIO',
                CONCAT('{"correo":"', @correo, '","motivo":"Credenciales incorrectas"}'));

        SELECT 0 AS exito, 'Credenciales incorrectas' AS mensaje,
               NULL AS id_usuario, NULL AS id_rol,
               NULL AS nombre_rol,  NULL AS nombre_completo;
        RETURN;
    END

    IF @activo = 0
    BEGIN
        SELECT 0 AS exito, 'Usuario inactivo' AS mensaje,
               NULL AS id_usuario, NULL AS id_rol,
               NULL AS nombre_rol,  NULL AS nombre_completo;
        RETURN;
    END

    -- Actualizar último acceso
    UPDATE tbUsuario SET ultimo_acceso = GETDATE() WHERE id_usuario = @id_usuario;

    -- Bitácora
    INSERT INTO tbBitacoraAuditoria
        (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
    VALUES
        (@id_usuario, 'LOGIN', 'USUARIO', @id_usuario,
         CONCAT('{"correo":"', @correo,
                '","fecha":"', CONVERT(VARCHAR, GETDATE(), 120), '"}'));

    SELECT
        1                  AS exito,
        'Login exitoso'    AS mensaje,
        u.id_usuario,
        u.id_rol,
        r.nombre           AS nombre_rol,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo
    FROM tbUsuario u
    INNER JOIN tbRol r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = @id_usuario;
END;
GO

-- ============================================================
-- GENERAR BACKUP DE BASE DE DATOS + MONITOREO DE TIEMPOS
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GenerarBackup
    @ruta_backup  VARCHAR(400) = NULL,  -- opcional. si viene null, se construye ruta por defecto.
    @id_usuario_op INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id_monitoreo INT;
    DECLARE @inicio DATETIME = GETDATE();
    DECLARE @db SYSNAME = DB_NAME();
    DECLARE @ruta_final VARCHAR(400);
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @fecha_token VARCHAR(20) = REPLACE(REPLACE(CONVERT(VARCHAR(19), @inicio, 120), '-', ''), ':', '');
    -- @fecha_token queda tipo: 20260531 010203 -> quitamos espacio:
    SET @fecha_token = REPLACE(@fecha_token, ' ', '_');

    SET @ruta_final = NULLIF(LTRIM(RTRIM(@ruta_backup)), '');
    IF @ruta_final IS NULL
        SET @ruta_final = CONCAT('/var/opt/mssql/backups/', @db, '_', @fecha_token, '.bak');

    INSERT INTO tbMonitoreoTiempos (proceso, fecha_inicio, estado, detalle, ruta_backup, id_usuario)
    VALUES ('BACKUP_DB', @inicio, 'INICIADO', 'Inicio de respaldo de base de datos', @ruta_final, @id_usuario_op);
    SET @id_monitoreo = SCOPE_IDENTITY();

    BEGIN TRY
        SET @sql = N'BACKUP DATABASE [' + @db + N'] TO DISK = N''' + REPLACE(@ruta_final, '''', '''''') + N''' WITH INIT, COMPRESSION, STATS = 10;';
        EXEC (@sql);

        UPDATE tbMonitoreoTiempos
        SET fecha_fin = GETDATE(),
            duracion_ms = DATEDIFF(MILLISECOND, @inicio, GETDATE()),
            estado = 'EXITOSO',
            detalle = 'Backup completado correctamente'
        WHERE id_monitoreo = @id_monitoreo;

        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES (
            @id_usuario_op,
            'INSERT',
            'MONITOREO_BACKUP',
            @id_monitoreo,
            CONCAT('{"ruta_backup":"', @ruta_final, '","estado":"EXITOSO"}')
        );

        SELECT 1 AS exito, 'Backup generado correctamente' AS mensaje, @ruta_final AS ruta_backup, @id_monitoreo AS id_monitoreo;
    END TRY
    BEGIN CATCH
        UPDATE tbMonitoreoTiempos
        SET fecha_fin = GETDATE(),
            duracion_ms = DATEDIFF(MILLISECOND, @inicio, GETDATE()),
            estado = 'ERROR',
            detalle = LEFT(ERROR_MESSAGE(), 500)
        WHERE id_monitoreo = @id_monitoreo;

        INSERT INTO tbBitacoraAuditoria (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_nuevos)
        VALUES (
            @id_usuario_op,
            'ERROR',
            'MONITOREO_BACKUP',
            @id_monitoreo,
            CONCAT('{"ruta_backup":"', @ruta_final, '","error":"', LEFT(REPLACE(ERROR_MESSAGE(), '"', ''''), 400), '"}')
        );

        SELECT 0 AS exito, ERROR_MESSAGE() AS mensaje, @ruta_final AS ruta_backup, @id_monitoreo AS id_monitoreo;
    END CATCH;
END;
GO