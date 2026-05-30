USE dbUniPochinqui;
GO

-- ============================================================
-- BLOQUE 1: CTEs (Common Table Expressions)
-- ============================================================

-- ------------------------------------------------------------
-- CTE 1: Promedio ponderado por estudiante en cada sección
-- Muestra solo los que están en riesgo (promedio < 61)
-- ------------------------------------------------------------
WITH cte_promedios AS (
    SELECT
        asig.id_asignacion,
        asig.id_estudiante,
        asig.id_seccion,
        CAST(
            SUM(n.calificacion * ae.ponderacion / 100.0)
            / NULLIF(SUM(ae.ponderacion / 100.0), 0)
        AS DECIMAL(5,2)) AS promedio_ponderado,
        COUNT(n.id_nota) AS actividades_con_nota
    FROM tbAsignacion asig
    LEFT JOIN tbNota n  ON n.id_asignacion = asig.id_asignacion
    LEFT JOIN tbActividadEvaluacion ae ON ae.id_actividad = n.id_actividad
    WHERE asig.estado = 'Activa'
    GROUP BY asig.id_asignacion, asig.id_estudiante, asig.id_seccion
)
SELECT
    e.carnet,
    CONCAT(u.nombre, ' ', u.apellido)  AS estudiante,
    c.nombre                            AS curso,
    s.codigo_seccion,
    p.promedio_ponderado,
    p.actividades_con_nota,
    CASE
        WHEN p.promedio_ponderado IS NULL THEN 'Sin notas'
        WHEN p.promedio_ponderado < 61    THEN 'En riesgo'
        WHEN p.promedio_ponderado < 70    THEN 'Regular'
        ELSE 'Aprobado'
    END AS estado
FROM cte_promedios p
INNER JOIN tbEstudiante e ON e.id_estudiante = p.id_estudiante
INNER JOIN tbUsuario    u ON u.id_usuario    = e.id_usuario
INNER JOIN tbSeccion    s ON s.id_seccion    = p.id_seccion
INNER JOIN tbCurso      c ON c.id_curso      = s.id_curso
ORDER BY p.promedio_ponderado ASC;
GO

-- ------------------------------------------------------------
-- CTE 2: Ranking de estudiantes dentro de cada sección
-- Usa ROW_NUMBER y DENSE_RANK para posición por notas
-- ------------------------------------------------------------
WITH cte_base AS (
    SELECT
        asig.id_seccion,
        asig.id_estudiante,
        CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio
    FROM tbAsignacion asig
    INNER JOIN tbNota n ON n.id_asignacion = asig.id_asignacion
    GROUP BY asig.id_seccion, asig.id_estudiante
)
SELECT
    s.codigo_seccion,
    c.nombre                              AS curso,
    CONCAT(u.nombre, ' ', u.apellido)     AS estudiante,
    e.carnet,
    cb.promedio,
    ROW_NUMBER()  OVER (PARTITION BY cb.id_seccion ORDER BY cb.promedio DESC) AS posicion,
    DENSE_RANK()  OVER (PARTITION BY cb.id_seccion ORDER BY cb.promedio DESC) AS posicion_empates,
    PERCENT_RANK() OVER (PARTITION BY cb.id_seccion ORDER BY cb.promedio DESC) * 100 AS percentil
FROM cte_base cb
INNER JOIN tbSeccion    s ON s.id_seccion  = cb.id_seccion
INNER JOIN tbCurso      c ON c.id_curso    = s.id_curso
INNER JOIN tbEstudiante e ON e.id_estudiante = cb.id_estudiante
INNER JOIN tbUsuario    u ON u.id_usuario  = e.id_usuario
ORDER BY s.codigo_seccion, posicion;
GO

-- ------------------------------------------------------------
-- CTE 3: Recursiva — jerarquía de cursos por ciclo dentro
-- de cada carrera (árbol de plan de estudios)
-- ------------------------------------------------------------
WITH cte_plan AS (
    -- Ancla: cursos del ciclo 1
    SELECT
        id_carrera,
        id_curso,
        codigo,
        nombre,
        ciclo_requerido,
        creditos,
        CAST(nombre AS VARCHAR(500))          AS ruta,
        1                                      AS nivel
    FROM tbCurso
    WHERE ciclo_requerido = 1 AND activo = 1

    UNION ALL

    -- Recursión: siguiente ciclo
    SELECT
        c.id_carrera,
        c.id_curso,
        c.codigo,
        c.nombre,
        c.ciclo_requerido,
        c.creditos,
        CAST(cp.ruta + ' → ' + c.nombre AS VARCHAR(500)),
        cp.nivel + 1
    FROM tbCurso c
    INNER JOIN cte_plan cp
        ON  cp.id_carrera      = c.id_carrera
        AND cp.ciclo_requerido = c.ciclo_requerido - 1
    WHERE c.activo = 1
)
SELECT
    car.nombre              AS carrera,
    cp.ciclo_requerido      AS ciclo,
    cp.codigo,
    cp.nombre               AS curso,
    cp.creditos,
    cp.ruta                 AS ruta_plan,
    cp.nivel
FROM cte_plan cp
INNER JOIN tbCarrera car ON car.id_carrera = cp.id_carrera
ORDER BY car.nombre, cp.ciclo_requerido, cp.codigo
OPTION (MAXRECURSION 12);
GO

-- ------------------------------------------------------------
-- CTE 4: Encadenada — resumen de asistencia + nota + alerta
-- Una CTE construye sobre otra
-- ------------------------------------------------------------
WITH cte_asistencia AS (
    SELECT
        a.id_asignacion,
        COUNT(*)                                                    AS total_clases,
        SUM(CASE WHEN a.estado = 'Presente'    THEN 1 ELSE 0 END)  AS presentes,
        SUM(CASE WHEN a.estado = 'Ausente'     THEN 1 ELSE 0 END)  AS ausentes,
        CAST(
            100.0 * SUM(CASE WHEN a.estado = 'Ausente' THEN 1 ELSE 0 END)
            / NULLIF(COUNT(*), 0)
        AS DECIMAL(5,2))                                            AS pct_ausencia
    FROM tbAsistencia a
    GROUP BY a.id_asignacion
),
cte_notas AS (
    SELECT
        n.id_asignacion,
        CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio_notas,
        MIN(n.calificacion)                        AS nota_min,
        MAX(n.calificacion)                        AS nota_max
    FROM tbNota n
    GROUP BY n.id_asignacion
),
cte_alertas AS (
    SELECT
        asig.id_asignacion,
        COUNT(al.id_alerta) AS alertas_activas
    FROM tbAsignacion asig
    LEFT JOIN tbAlertaAcademica al
        ON  al.id_estudiante = asig.id_estudiante
        AND al.id_seccion    = asig.id_seccion
        AND al.resuelta      = 0
    GROUP BY asig.id_asignacion
)
SELECT
    e.carnet,
    CONCAT(u.nombre, ' ', u.apellido)  AS estudiante,
    c.nombre                            AS curso,
    s.codigo_seccion,
    ISNULL(ast.total_clases, 0)         AS clases_registradas,
    ISNULL(ast.pct_ausencia, 0)         AS pct_ausencia,
    ISNULL(nt.promedio_notas, 0)        AS promedio,
    ISNULL(nt.nota_min, 0)              AS nota_min,
    ISNULL(nt.nota_max, 0)              AS nota_max,
    ISNULL(al.alertas_activas, 0)       AS alertas_activas,
    CASE
        WHEN ISNULL(nt.promedio_notas,0) < 61
          OR ISNULL(ast.pct_ausencia,0)  > 30 THEN 'CRÍTICO'
        WHEN ISNULL(nt.promedio_notas,0) < 70 THEN 'ATENCIÓN'
        ELSE 'Normal'
    END                                 AS semaforo
FROM tbAsignacion asig
INNER JOIN tbEstudiante e ON e.id_estudiante = asig.id_estudiante
INNER JOIN tbUsuario    u ON u.id_usuario    = e.id_usuario
INNER JOIN tbSeccion    s ON s.id_seccion    = asig.id_seccion
INNER JOIN tbCurso      c ON c.id_curso      = s.id_curso
LEFT  JOIN cte_asistencia ast ON ast.id_asignacion = asig.id_asignacion
LEFT  JOIN cte_notas      nt  ON nt.id_asignacion  = asig.id_asignacion
LEFT  JOIN cte_alertas    al  ON al.id_asignacion  = asig.id_asignacion
WHERE asig.estado = 'Activa'
ORDER BY semaforo DESC, promedio ASC;
GO


-- ============================================================
-- BLOQUE 2: SUBCONSULTAS
-- ============================================================

-- ------------------------------------------------------------
-- SUB 1: Estudiantes cuyo promedio está por debajo
-- del promedio general de su sección
-- ------------------------------------------------------------
SELECT
    e.carnet,
    CONCAT(u.nombre, ' ', u.apellido)   AS estudiante,
    s.codigo_seccion,
    CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio_personal,
    (
        SELECT CAST(AVG(n2.calificacion) AS DECIMAL(5,2))
        FROM tbNota n2
        INNER JOIN tbAsignacion a2 ON a2.id_asignacion = n2.id_asignacion
        WHERE a2.id_seccion = asig.id_seccion
    ) AS promedio_seccion
FROM tbAsignacion asig
INNER JOIN tbEstudiante e ON e.id_estudiante = asig.id_estudiante
INNER JOIN tbUsuario    u ON u.id_usuario    = e.id_usuario
INNER JOIN tbSeccion    s ON s.id_seccion    = asig.id_seccion
INNER JOIN tbNota       n ON n.id_asignacion = asig.id_asignacion
GROUP BY e.carnet, u.nombre, u.apellido, s.codigo_seccion, asig.id_seccion
HAVING AVG(n.calificacion) < (
    SELECT AVG(n2.calificacion)
    FROM tbNota n2
    INNER JOIN tbAsignacion a2 ON a2.id_asignacion = n2.id_asignacion
    WHERE a2.id_seccion = asig.id_seccion
)
ORDER BY promedio_personal ASC;
GO

-- ------------------------------------------------------------
-- SUB 2: Secciones con más del 20% de estudiantes en riesgo
-- Subconsulta correlacionada en WHERE con EXISTS
-- ------------------------------------------------------------
SELECT
    s.codigo_seccion,
    c.nombre                                AS curso,
    CONCAT(u.nombre, ' ', u.apellido)       AS docente,
    (SELECT COUNT(*) FROM tbAsignacion a WHERE a.id_seccion = s.id_seccion AND a.estado = 'Activa')
        AS total_inscritos,
    (
        SELECT COUNT(*)
        FROM tbAsignacion a2
        INNER JOIN tbNota n ON n.id_asignacion = a2.id_asignacion
        WHERE a2.id_seccion = s.id_seccion
        GROUP BY a2.id_seccion
        HAVING AVG(n.calificacion) < 61
    ) AS estudiantes_en_riesgo
FROM tbSeccion s
INNER JOIN tbCurso   c ON c.id_curso   = s.id_curso
INNER JOIN tbDocente d ON d.id_docente = s.id_docente
INNER JOIN tbUsuario u ON u.id_usuario = d.id_usuario
WHERE EXISTS (
    SELECT 1
    FROM tbAsignacion a2
    INNER JOIN tbNota n2 ON n2.id_asignacion = a2.id_asignacion
    WHERE a2.id_seccion = s.id_seccion
    GROUP BY a2.id_asignacion
    HAVING AVG(n2.calificacion) < 61
)
AND s.estado = 'Abierta';
GO

-- ------------------------------------------------------------
-- SUB 3: Docentes que imparten cursos en el período activo
-- y tienen al menos un estudiante con alerta activa
-- ------------------------------------------------------------
SELECT DISTINCT
    CONCAT(u.nombre, ' ', u.apellido)   AS docente,
    d.especialidad,
    d.grado_academico,
    (
        SELECT COUNT(DISTINCT al.id_estudiante)
        FROM tbAlertaAcademica al
        INNER JOIN tbSeccion s2 ON s2.id_seccion = al.id_seccion
        WHERE s2.id_docente = d.id_docente
          AND al.resuelta   = 0
    ) AS estudiantes_con_alerta
FROM tbDocente d
INNER JOIN tbUsuario  u ON u.id_usuario  = d.id_usuario
INNER JOIN tbSeccion  s ON s.id_docente  = d.id_docente
INNER JOIN tbPeriodoAcademico pa ON pa.id_periodo = s.id_periodo AND pa.activo = 1
WHERE d.id_docente IN (
    SELECT DISTINCT s3.id_docente
    FROM tbSeccion s3
    INNER JOIN tbAlertaAcademica al ON al.id_seccion = s3.id_seccion
    WHERE al.resuelta = 0
)
ORDER BY estudiantes_con_alerta DESC;
GO


-- ============================================================
-- BLOQUE 3: FUNCIONES DE AGREGACIÓN AVANZADAS
-- ============================================================

-- ------------------------------------------------------------
-- AGR 1: Estadísticas completas por curso y período
-- MIN, MAX, AVG, STDEV, percentiles con PERCENTILE_CONT
-- ------------------------------------------------------------
SELECT
    c.codigo,
    c.nombre                                                AS curso,
    pa.nombre                                               AS periodo,
    COUNT(DISTINCT asig.id_estudiante)                      AS estudiantes,
    CAST(AVG(n.calificacion)  AS DECIMAL(5,2))              AS promedio,
    CAST(STDEV(n.calificacion) AS DECIMAL(5,2))             AS desviacion_std,
    MIN(n.calificacion)                                     AS nota_minima,
    MAX(n.calificacion)                                     AS nota_maxima,
    SUM(CASE WHEN n.calificacion >= 61 THEN 1 ELSE 0 END)   AS aprobados,
    SUM(CASE WHEN n.calificacion <  61 THEN 1 ELSE 0 END)   AS reprobados,
    CAST(
        100.0 * SUM(CASE WHEN n.calificacion >= 61 THEN 1 ELSE 0 END)
        / NULLIF(COUNT(n.id_nota), 0)
    AS DECIMAL(5,2))                                        AS pct_aprobacion
FROM tbNota n
INNER JOIN tbAsignacion asig ON asig.id_asignacion = n.id_asignacion
INNER JOIN tbSeccion    s    ON s.id_seccion        = asig.id_seccion
INNER JOIN tbCurso      c    ON c.id_curso          = s.id_curso
INNER JOIN tbPeriodoAcademico pa ON pa.id_periodo  = s.id_periodo
GROUP BY c.codigo, c.nombre, pa.nombre
ORDER BY pa.nombre, promedio DESC;
GO

-- ------------------------------------------------------------
-- AGR 2: ROLLUP — resumen de notas por carrera > curso > sección
-- ------------------------------------------------------------
SELECT
    ISNULL(car.nombre, 'TOTAL GENERAL')    AS carrera,
    ISNULL(c.nombre,   '-- Subtotal --')   AS curso,
    ISNULL(s.codigo_seccion, '  Sub')      AS seccion,
    COUNT(DISTINCT asig.id_estudiante)     AS estudiantes,
    CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio,
    COUNT(n.id_nota)                       AS notas_registradas
FROM tbNota n
INNER JOIN tbAsignacion asig ON asig.id_asignacion = n.id_asignacion
INNER JOIN tbSeccion    s    ON s.id_seccion        = asig.id_seccion
INNER JOIN tbCurso      c    ON c.id_curso          = s.id_curso
INNER JOIN tbCarrera    car  ON car.id_carrera      = c.id_carrera
GROUP BY ROLLUP(car.nombre, c.nombre, s.codigo_seccion)
ORDER BY car.nombre, c.nombre, s.codigo_seccion;
GO

-- ------------------------------------------------------------
-- AGR 3: Evolución de asistencia por semana (tendencia temporal)
-- Usa DATEPART para agrupar por semana del año
-- ------------------------------------------------------------
SELECT
    s.codigo_seccion,
    c.nombre                                                AS curso,
    DATEPART(WEEK, a.fecha)                                 AS semana,
    MIN(a.fecha)                                            AS inicio_semana,
    COUNT(*)                                                AS clases_semana,
    SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END)  AS presentes,
    SUM(CASE WHEN a.estado = 'Ausente'  THEN 1 ELSE 0 END)  AS ausentes,
    CAST(
        100.0 * SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2))                                        AS pct_asistencia_semana
FROM tbAsistencia a
INNER JOIN tbAsignacion asig ON asig.id_asignacion = a.id_asignacion
INNER JOIN tbSeccion    s    ON s.id_seccion        = asig.id_seccion
INNER JOIN tbCurso      c    ON c.id_curso          = s.id_curso
GROUP BY s.codigo_seccion, c.nombre, DATEPART(WEEK, a.fecha)
ORDER BY s.codigo_seccion, semana;
GO

-- ------------------------------------------------------------
-- AGR 4: Funciones de ventana — promedio móvil de notas
-- LAG para comparar con actividad anterior
-- ------------------------------------------------------------
SELECT
    e.carnet,
    CONCAT(u.nombre, ' ', u.apellido)       AS estudiante,
    ae.nombre                               AS actividad,
    ae.tipo,
    n.calificacion,
    CAST(AVG(n.calificacion) OVER (
        PARTITION BY n.id_asignacion
        ORDER BY ae.fecha_entrega
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS DECIMAL(5,2))                      AS promedio_movil_3,
    LAG(n.calificacion, 1) OVER (
        PARTITION BY n.id_asignacion
        ORDER BY ae.fecha_entrega
    )                                       AS nota_actividad_anterior,
    n.calificacion - ISNULL(LAG(n.calificacion,1) OVER (
        PARTITION BY n.id_asignacion
        ORDER BY ae.fecha_entrega
    ), n.calificacion)                      AS variacion
FROM tbNota n
INNER JOIN tbActividadEvaluacion ae ON ae.id_actividad  = n.id_actividad
INNER JOIN tbAsignacion asig         ON asig.id_asignacion = n.id_asignacion
INNER JOIN tbEstudiante e            ON e.id_estudiante  = asig.id_estudiante
INNER JOIN tbUsuario    u            ON u.id_usuario     = e.id_usuario
ORDER BY e.carnet, ae.fecha_entrega;
GO


-- ============================================================
-- BLOQUE 4: DATOS JERÁRQUICOS
-- ============================================================

-- ------------------------------------------------------------
-- JER 1: Árbol completo carrera → curso → sección → estudiante
-- Con nivel de indentación visual
-- ------------------------------------------------------------
SELECT
    1                                      AS nivel,
    car.nombre                             AS nodo,
    CAST(NULL AS VARCHAR(20))              AS codigo,
    car.creditos_totales                   AS dato_num,
    'Carrera'                              AS tipo,
    car.id_carrera                         AS id_padre
FROM tbCarrera car WHERE car.activa = 1

UNION ALL

SELECT
    2,
    REPLICATE('  ', 1) + c.nombre,
    c.codigo,
    c.creditos,
    'Curso',
    c.id_carrera
FROM tbCurso c WHERE c.activo = 1

UNION ALL

SELECT
    3,
    REPLICATE('  ', 2) + s.codigo_seccion,
    s.codigo_seccion,
    s.cupo_maximo,
    'Sección',
    s.id_curso
FROM tbSeccion s WHERE s.estado IN ('Abierta', 'Finalizada')

UNION ALL

SELECT
    4,
    REPLICATE('  ', 3) + CONCAT(u.nombre,' ',u.apellido),
    e.carnet,
    CAST(AVG(n.calificacion) AS INT),
    'Estudiante',
    asig.id_seccion
FROM tbAsignacion asig
INNER JOIN tbEstudiante e ON e.id_estudiante = asig.id_estudiante
INNER JOIN tbUsuario    u ON u.id_usuario    = e.id_usuario
LEFT  JOIN tbNota       n ON n.id_asignacion = asig.id_asignacion
GROUP BY u.nombre, u.apellido, e.carnet, asig.id_seccion

ORDER BY id_padre, nivel, codigo;
GO

-- ------------------------------------------------------------
-- JER 2: Historial académico completo de un estudiante
-- Todos sus períodos, cursos, notas y estado final
-- ------------------------------------------------------------
SELECT
    pa.nombre                                   AS periodo,
    c.codigo,
    c.nombre                                    AS curso,
    s.codigo_seccion,
    CONCAT(ud.nombre,' ',ud.apellido)           AS docente,
    CAST(
        SUM(n.calificacion * ae.ponderacion / 100.0)
        / NULLIF(SUM(ae.ponderacion / 100.0), 0)
    AS DECIMAL(5,2))                            AS promedio_ponderado,
    asig.estado                                 AS resultado,
    SUM(CASE WHEN ast.estado = 'Ausente' THEN 1 ELSE 0 END) AS faltas
FROM tbAsignacion asig
INNER JOIN tbSeccion           s   ON s.id_seccion    = asig.id_seccion
INNER JOIN tbCurso             c   ON c.id_curso      = s.id_curso
INNER JOIN tbDocente           doc ON doc.id_docente  = s.id_docente
INNER JOIN tbUsuario           ud  ON ud.id_usuario   = doc.id_usuario
INNER JOIN tbPeriodoAcademico pa  ON pa.id_periodo   = s.id_periodo
LEFT  JOIN tbNota              n   ON n.id_asignacion = asig.id_asignacion
LEFT  JOIN tbActividadEvaluacion ae ON ae.id_actividad = n.id_actividad
LEFT  JOIN tbAsistencia        ast ON ast.id_asignacion = asig.id_asignacion
WHERE asig.id_estudiante = 1  
GROUP BY pa.nombre, c.codigo, c.nombre, s.codigo_seccion, c.ciclo_requerido,
         ud.nombre, ud.apellido, asig.estado, pa.fecha_inicio
ORDER BY pa.fecha_inicio, c.ciclo_requerido;
GO


-- ============================================================
-- BLOQUE 5: UPDATE Y DELETE EN CASCADA CONTROLADOS
-- ============================================================

-- ------------------------------------------------------------
-- CAS 1: Retirar estudiante de todas sus secciones activas
-- cuando su estado cambia a Suspendido (lógica de negocio)
-- ------------------------------------------------------------
BEGIN TRANSACTION;

    -- Suspender al estudiante 8 (ejemplo)
    UPDATE tbEstudiante
    SET estado_academico = 'Suspendido'
    WHERE id_estudiante = 8;

    -- Retirar todas sus asignaciones activas en cascada
    UPDATE tbAsignacion
    SET estado = 'Retirada'
    WHERE id_estudiante = 8
      AND estado = 'Activa';

    -- Resolver alertas pendientes
    UPDATE tbAlertaAcademica
    SET resuelta = 1
    WHERE id_estudiante = 8
      AND resuelta = 0;

    SELECT 'Estudiante 8 suspendido y retirado de ' +
           CAST(@@ROWCOUNT AS VARCHAR) + ' secciones' AS resultado;

ROLLBACK; -- Cambiar a COMMIT en producción
GO

-- ------------------------------------------------------------
-- CAS 2: Cancelar sección y mover estudiantes a otra
-- Actualización en cascada con tabla temporal auxiliar
-- ------------------------------------------------------------
BEGIN TRANSACTION;

    DECLARE @sec_cancelar INT = 4;   -- sección a cancelar
    DECLARE @sec_destino  INT = 3;   -- sección donde se mueven

    -- Marcar sección como cancelada
    UPDATE tbSeccion SET estado = 'Cancelada' WHERE id_seccion = @sec_cancelar;

    -- Insertar en nueva sección los que no estén ya inscritos
    INSERT INTO tbAsignacion(id_seccion, id_estudiante, estado)
    SELECT @sec_destino, id_estudiante, 'Activa'
    FROM tbAsignacion
    WHERE id_seccion = @sec_cancelar
      AND estado     = 'Activa'
      AND id_estudiante NOT IN (
          SELECT id_estudiante FROM tbAsignacion
          WHERE id_seccion = @sec_destino
      );

    -- Retirar de la sección cancelada
    UPDATE tbAsignacion
    SET estado = 'Retirada'
    WHERE id_seccion = @sec_cancelar AND estado = 'Activa';

    SELECT 'Traslado completado' AS resultado;

ROLLBACK; -- Cambiar a COMMIT en producción
GO


-- ============================================================
-- BLOQUE 6: CONSULTAS PARA REPORTES (las usarás en PDF/Excel)
-- ============================================================

-- ------------------------------------------------------------
-- RPT 1: Resumen ejecutivo por período activo
-- (vista de dashboard del coordinador)
-- ------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM tbEstudiante WHERE estado_academico = 'Activo')
        AS estudiantes_activos,
    (SELECT COUNT(*) FROM tbSeccion WHERE estado = 'Abierta')
        AS secciones_abiertas,
    (SELECT COUNT(*) FROM tbAsignacion WHERE estado = 'Activa')
        AS inscripciones_activas,
    (SELECT CAST(AVG(calificacion) AS DECIMAL(5,2)) FROM tbNota)
        AS promedio_global,
    (SELECT COUNT(*) FROM tbAlertaAcademica WHERE resuelta = 0)
        AS alertas_pendientes,
    (SELECT COUNT(*) FROM tbAlertaAcademica WHERE tipo_alerta = 'En riesgo' AND resuelta = 0)
        AS estudiantes_en_riesgo;
GO

-- ------------------------------------------------------------
-- RPT 2: Reporte de rendimiento por carrera
-- Para gráfica de barras en dashboard
-- ------------------------------------------------------------
SELECT
    car.nombre                                  AS carrera,
    COUNT(DISTINCT asig.id_estudiante)          AS estudiantes,
    CAST(AVG(n.calificacion) AS DECIMAL(5,2))   AS promedio,
    SUM(CASE WHEN n.calificacion >= 61 THEN 1 ELSE 0 END) AS aprobados,
    SUM(CASE WHEN n.calificacion <  61 THEN 1 ELSE 0 END) AS reprobados,
    CAST(
        100.0 * SUM(CASE WHEN n.calificacion >= 61 THEN 1 ELSE 0 END)
        / NULLIF(COUNT(n.id_nota), 0)
    AS DECIMAL(5,2))                            AS pct_aprobacion
FROM tbNota n
INNER JOIN tbAsignacion asig ON asig.id_asignacion = n.id_asignacion
INNER JOIN tbEstudiante e    ON e.id_estudiante    = asig.id_estudiante
INNER JOIN tbCarrera    car  ON car.id_carrera     = e.id_carrera
GROUP BY car.nombre
ORDER BY promedio DESC;
GO

-- ------------------------------------------------------------
-- RPT 3: Top 5 estudiantes con mejor rendimiento global
-- ------------------------------------------------------------
SELECT TOP 5
    e.carnet,
    CONCAT(u.nombre, ' ', u.apellido)   AS estudiante,
    car.nombre                           AS carrera,
    COUNT(DISTINCT asig.id_seccion)     AS cursos_cursados,
    CAST(AVG(n.calificacion) AS DECIMAL(5,2)) AS promedio_global,
    SUM(n.calificacion)                 AS puntos_acumulados
FROM tbNota n
INNER JOIN tbAsignacion asig ON asig.id_asignacion = n.id_asignacion
INNER JOIN tbEstudiante e    ON e.id_estudiante    = asig.id_estudiante
INNER JOIN tbUsuario    u    ON u.id_usuario       = e.id_usuario
INNER JOIN tbCarrera    car  ON car.id_carrera     = e.id_carrera
GROUP BY e.carnet, u.nombre, u.apellido, car.nombre
ORDER BY promedio_global DESC;
GO

-- ------------------------------------------------------------
-- RPT 4: Actividad de la bitácora — resumen de acciones
-- Para módulo de auditoría del admin
-- ------------------------------------------------------------
SELECT
    CONVERT(DATE, fecha_hora)           AS fecha,
    accion,
    tabla_afectada,
    COUNT(*)                            AS total_operaciones,
    COUNT(DISTINCT id_usuario)          AS usuarios_distintos
FROM tbBitacoraAuditoria
GROUP BY CONVERT(DATE, fecha_hora), accion, tabla_afectada
ORDER BY fecha DESC, total_operaciones DESC;
GO