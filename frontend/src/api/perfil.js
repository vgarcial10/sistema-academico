import api from './client';

// GET /api/estudiantes/me -> estudiante asociado al usuario autenticado
export async function getMiEstudiante() {
  const { data } = await api.get('/estudiantes/me');
  return data;
}

// GET /api/perfil/:id_estudiante -> { datos, secciones, alertas }
export async function getPerfil(idEstudiante) {
  const { data } = await api.get(`/perfil/${idEstudiante}`);
  return data;
}

// POST /api/ai/consulta -> { respuesta, timestamp }
export async function consultarIA(pregunta, idEstudiante) {
  const { data } = await api.post('/ai/consulta', { pregunta, id_estudiante: idEstudiante });
  return data;
}
