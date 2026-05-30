USE dbUniPochinqui;
GO

-- ============================================================
-- NOTA — audita inserciones, cambios y borrados
-- ============================================================
CREATE OR ALTER TRIGGER trg_Nota_Auditoria
ON tbNota
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT
            NULL,
            'INSERT',
            'NOTA',
            i.id_nota,
            NULL,
            CONCAT('{"id_asignacion":', i.id_asignacion,
                   ',"id_actividad":',  i.id_actividad,
                   ',"calificacion":',  i.calificacion, '}')
        FROM inserted i;
    END

    -- UPDATE
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT
            NULL,
            'UPDATE',
            'NOTA',
            i.id_nota,
            CONCAT('{"calificacion":', d.calificacion,
                   ',"observaciones":"', ISNULL(d.observaciones,''), '"}'),
            CONCAT('{"calificacion":', i.calificacion,
                   ',"observaciones":"', ISNULL(i.observaciones,''), '"}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_nota = i.id_nota;
    END

    -- DELETE
    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT
            NULL,
            'DELETE',
            'NOTA',
            d.id_nota,
            CONCAT('{"id_asignacion":', d.id_asignacion,
                   ',"id_actividad":',  d.id_actividad,
                   ',"calificacion":',  d.calificacion, '}'),
            NULL
        FROM deleted d;
    END
END;
GO

-- ============================================================
-- : ASISTENCIA
-- ============================================================
CREATE OR ALTER TRIGGER trg_Asistencia_Auditoria
ON tbAsistencia
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'INSERT', 'ASISTENCIA', i.id_asistencia, NULL,
            CONCAT('{"id_asignacion":', i.id_asignacion,
                   ',"fecha":"', CONVERT(VARCHAR, i.fecha, 23),
                   '","estado":"', i.estado, '"}')
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'UPDATE', 'ASISTENCIA', i.id_asistencia,
            CONCAT('{"estado":"', d.estado, '"}'),
            CONCAT('{"estado":"', i.estado, '","observaciones":"', ISNULL(i.observaciones,''), '"}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_asistencia = i.id_asistencia;
    END

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'DELETE', 'ASISTENCIA', d.id_asistencia,
            CONCAT('{"id_asignacion":', d.id_asignacion,
                   ',"fecha":"', CONVERT(VARCHAR, d.fecha, 23),
                   '","estado":"', d.estado, '"}'),
            NULL
        FROM deleted d;
    END
END;
GO

-- ============================================================
-- ASIGNACION
-- ============================================================
CREATE OR ALTER TRIGGER trg_Asignacion_Auditoria
ON tbAsignacion
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Validación de cupo en INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- Verificar cupo por cada fila insertada
        IF EXISTS (
            SELECT 1
            FROM inserted i
            INNER JOIN tbSeccion s ON s.id_seccion = i.id_seccion
            WHERE (
                SELECT COUNT(*) FROM tbAsignacion a
                WHERE a.id_seccion = i.id_seccion AND a.estado = 'Activa'
            ) > s.cupo_maximo
        )
        BEGIN
            RAISERROR('Cupo máximo de la sección superado.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'INSERT', 'ASIGNACION', i.id_asignacion, NULL,
            CONCAT('{"id_seccion":', i.id_seccion,
                   ',"id_estudiante":', i.id_estudiante,
                   ',"estado":"', i.estado, '"}')
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'UPDATE', 'ASIGNACION', i.id_asignacion,
            CONCAT('{"estado":"', d.estado, '"}'),
            CONCAT('{"estado":"', i.estado, '"}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_asignacion = i.id_asignacion;
    END

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'DELETE', 'ASIGNACION', d.id_asignacion,
            CONCAT('{"id_seccion":', d.id_seccion,
                   ',"id_estudiante":', d.id_estudiante, '}'),
            NULL
        FROM deleted d;
    END
END;
GO

-- ============================================================
-- USUARIO — audita cambios de datos sensibles
-- ============================================================
CREATE OR ALTER TRIGGER trg_Usuario_Auditoria
ON tbUsuario
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'INSERT', 'USUARIO', i.id_usuario, NULL,
            CONCAT('{"correo":"', i.correo, '","id_rol":', i.id_rol, '}')
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'UPDATE', 'USUARIO', i.id_usuario,
            CONCAT('{"correo":"', d.correo, '","id_rol":', d.id_rol,
                   ',"activo":', d.activo, '}'),
            CONCAT('{"correo":"', i.correo, '","id_rol":', i.id_rol,
                   ',"activo":', i.activo, '}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_usuario = i.id_usuario;
    END

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'DELETE', 'USUARIO', d.id_usuario,
            CONCAT('{"correo":"', d.correo, '","id_rol":', d.id_rol, '}'),
            NULL
        FROM deleted d;
    END
END;
GO

-- ============================================================
-- ESTUDIANTE — cambios de estado académico
-- ============================================================
CREATE OR ALTER TRIGGER trg_Estudiante_Auditoria
ON tbEstudiante
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'UPDATE', 'ESTUDIANTE', i.id_estudiante,
            CONCAT('{"estado_academico":"', d.estado_academico,
                   '","ciclo_actual":', d.ciclo_actual, '}'),
            CONCAT('{"estado_academico":"', i.estado_academico,
                   '","ciclo_actual":', i.ciclo_actual, '}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_estudiante = i.id_estudiante
        WHERE d.estado_academico <> i.estado_academico
           OR d.ciclo_actual     <> i.ciclo_actual;
    END

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'DELETE', 'ESTUDIANTE', d.id_estudiante,
            CONCAT('{"carnet":"', d.carnet, '","estado":"', d.estado_academico, '"}'),
            NULL
        FROM deleted d;
    END
END;
GO

-- ============================================================
-- SECCION — cambios de estado
-- ============================================================
CREATE OR ALTER TRIGGER trg_Seccion_Auditoria
ON tbSeccion
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'UPDATE', 'SECCION', i.id_seccion,
            CONCAT('{"estado":"', d.estado, '","cupo_maximo":', d.cupo_maximo, '}'),
            CONCAT('{"estado":"', i.estado, '","cupo_maximo":', i.cupo_maximo, '}')
        FROM inserted i
        INNER JOIN deleted d ON d.id_seccion = i.id_seccion
        WHERE d.estado <> i.estado OR d.cupo_maximo <> i.cupo_maximo;
    END

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO tbBitacoraAuditoria
            (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos)
        SELECT NULL, 'DELETE', 'SECCION', d.id_seccion,
            CONCAT('{"codigo_seccion":"', d.codigo_seccion, '","estado":"', d.estado, '"}'),
            NULL
        FROM deleted d;
    END
END;
GO