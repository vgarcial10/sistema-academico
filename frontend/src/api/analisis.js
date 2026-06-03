import api from './client';

// GET /api/analisis/notas-consolidado -> consolidado UMG 2026 (carrera > ciclo > curso > estudiante)
export async function getCuboNotasPorCiclo(idCarrera = null) {
  const params = idCarrera ? { id_carrera: idCarrera } : {};
  const { data } = await api.get('/analisis/notas-consolidado', { params });
  return data;
}

/** @deprecated Usar getCuboNotasPorCiclo */
export async function getNotasConsolidado(idCarrera = null) {
  return getCuboNotasPorCiclo(idCarrera);
}
