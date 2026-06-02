import api from './client';

// POST /api/admin/backup -> ejecuta sp_GenerarBackup (solo Administrador)
export async function ejecutarBackup(ruta_backup = null) {
  const { data } = await api.post('/admin/backup', { ruta_backup });
  return data;
}

// GET /api/admin/backup/monitoreo -> historial de ejecuciones y tiempos
export async function getMonitoreoBackups() {
  const { data } = await api.get('/admin/backup/monitoreo');
  return data;
}
