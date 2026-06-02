import api from './client';

// GET /api/admin/monitoreo/consultas -> historial de tiempos de consultas SQL
export async function getMonitoreoConsultas() {
  const { data } = await api.get('/admin/monitoreo/consultas');
  return data;
}
