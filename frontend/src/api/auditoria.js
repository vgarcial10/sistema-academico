import api from './client';

// GET /api/auditoria -> ultimas 100 operaciones registradas (solo Administrador).
export async function getAuditoria() {
  const { data } = await api.get('/auditoria');
  return data;
}
