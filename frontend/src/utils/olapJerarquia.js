/**
 * Construye árbol OLAP desde filas planas con campo `nivel` (ROLLUP).
 * nivel: 0=total, 1=carrera, 2=ciclo, 3=curso, 4=estudiante
 */

const fmt = (v) => (v === null || v === undefined ? '-' : v);

function claveCiclo(ciclo) {
  return String(ciclo ?? '--');
}

function claveCurso(curso) {
  return String(curso ?? '--');
}

/** Filtra filas por nombre de carrera (o todas excepto duplicar totales ajenos). */
export function filtrarPorCarrera(rows, carreraNombre) {
  if (!carreraNombre || carreraNombre === 'TODAS') {
    return rows;
  }
  return rows.filter((r) => r.carrera === carreraNombre);
}

/** Resumen de carrera (nivel 1) para la carrera seleccionada. */
export function resumenCarrera(rows, carreraNombre) {
  return rows.find((r) => r.nivel === 1 && r.carrera === carreraNombre) || null;
}

/** Total general (nivel 0). */
export function totalGeneral(rows) {
  return rows.find((r) => r.nivel === 0) || null;
}

/**
 * Árbol: [{ ciclo, meta, cursos: [{ curso, meta, estudiantes: [...] }] }]
 * Usa filas nivel 2 (ciclo), 3 (curso), 4 (estudiante).
 */
export function buildArbolCiclos(rows, carreraNombre) {
  const base = filtrarPorCarrera(rows, carreraNombre);
  const nivel2 = base.filter((r) => r.nivel === 2 && claveCiclo(r.ciclo) !== '--');
  const nivel3 = base.filter((r) => r.nivel === 3);
  const nivel4 = base.filter((r) => r.nivel === 4);

  const ciclosMap = new Map();

  nivel2.forEach((rowCiclo) => {
    const ck = claveCiclo(rowCiclo.ciclo);
    if (!ciclosMap.has(ck)) {
      ciclosMap.set(ck, {
        ciclo: rowCiclo.ciclo,
        meta: rowCiclo,
        cursos: [],
      });
    }
  });

  nivel3.forEach((rowCurso) => {
    const ck = claveCiclo(rowCurso.ciclo);
    if (!ciclosMap.has(ck)) {
      ciclosMap.set(ck, { ciclo: rowCurso.ciclo, meta: null, cursos: [] });
    }
    const cicloNode = ciclosMap.get(ck);
    const cursoKey = claveCurso(rowCurso.curso);
    let cursoNode = cicloNode.cursos.find((c) => claveCurso(c.curso) === cursoKey);
    if (!cursoNode) {
      cursoNode = { curso: rowCurso.curso, meta: rowCurso, estudiantes: [] };
      cicloNode.cursos.push(cursoNode);
    }
  });

  nivel4.forEach((rowEst) => {
    const ck = claveCiclo(rowEst.ciclo);
    const cursoKey = claveCurso(rowEst.curso);
    if (!ciclosMap.has(ck)) return;
    const cicloNode = ciclosMap.get(ck);
    let cursoNode = cicloNode.cursos.find((c) => claveCurso(c.curso) === cursoKey);
    if (!cursoNode) {
      cursoNode = { curso: rowEst.curso, meta: null, estudiantes: [] };
      cicloNode.cursos.push(cursoNode);
    }
    cursoNode.estudiantes.push(rowEst);
  });

  const ciclos = Array.from(ciclosMap.values()).sort(
    (a, b) => Number(a.ciclo) - Number(b.ciclo)
  );

  ciclos.forEach((c) => {
    c.cursos.sort((a, b) => String(a.curso).localeCompare(String(b.curso)));
    c.cursos.forEach((cu) => {
      cu.estudiantes.sort((a, b) => String(a.estudiante).localeCompare(String(b.estudiante)));
    });
  });

  return ciclos;
}

/** Aplana el árbol visible para exportación Excel/PDF. */
export function aplanarArbolVisible(ciclos, expanded, keyPrefix = '') {
  const filas = [];
  const isExp = (key) => expanded[key] !== false;
  const pref = keyPrefix ? `${keyPrefix}-` : '';

  ciclos.forEach((cicloNode) => {
    const kCiclo = `${pref}ciclo-${cicloNode.ciclo}`;
    const metaC = cicloNode.meta || {};
    filas.push({
      nivel_label: 'Ciclo',
      carrera: fmt(metaC.carrera),
      ciclo: `Ciclo ${cicloNode.ciclo}`,
      curso: '--',
      estudiante: '--',
      estudiantes: metaC.estudiantes,
      promedio: metaC.promedio,
      notas_registradas: metaC.notas_registradas,
    });

    if (!isExp(kCiclo)) return;

    cicloNode.cursos.forEach((cursoNode) => {
      const kCurso = `${kCiclo}-curso-${cursoNode.curso}`;
      const metaCu = cursoNode.meta || {};
      filas.push({
        nivel_label: 'Curso',
        carrera: fmt(metaCu.carrera),
        ciclo: `Ciclo ${cicloNode.ciclo}`,
        curso: cursoNode.curso,
        estudiante: '--',
        estudiantes: metaCu.estudiantes,
        promedio: metaCu.promedio,
        notas_registradas: metaCu.notas_registradas,
      });

      if (!isExp(kCurso)) return;

      cursoNode.estudiantes.forEach((est) => {
        filas.push({
          nivel_label: 'Estudiante',
          carrera: fmt(est.carrera),
          ciclo: `Ciclo ${est.ciclo}`,
          curso: est.curso,
          estudiante: est.estudiante,
          estudiantes: 1,
          promedio: est.promedio,
          notas_registradas: est.notas_registradas,
        });
      });
    });
  });

  return filas;
}

export const COLUMNAS_EXPORT = [
  { key: 'nivel_label', label: 'Nivel' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'ciclo', label: 'Ciclo' },
  { key: 'curso', label: 'Curso' },
  { key: 'estudiante', label: 'Estudiante' },
  { key: 'estudiantes', label: 'Estudiantes' },
  { key: 'promedio', label: 'Promedio' },
  { key: 'notas_registradas', label: 'Notas registradas' },
];
