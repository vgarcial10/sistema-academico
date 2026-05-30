import api from './client';

// GET /api/reportes/notas/:id_seccion -> sp_ReporteNotasSeccion
export async function getReporteNotas(idSeccion) {
  const { data } = await api.get(`/reportes/notas/${idSeccion}`);
  return data;
}

// GET /api/reportes/asistencia/:id_seccion -> sp_ReporteAsistenciaSeccion
export async function getReporteAsistencia(idSeccion) {
  const { data } = await api.get(`/reportes/asistencia/${idSeccion}`);
  return data;
}
