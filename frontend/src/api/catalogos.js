import api from './client';

// GET /api/roles
export async function getRoles() {
  const { data } = await api.get('/roles');
  return data;
}

// GET /api/carreras
export async function getCarreras() {
  const { data } = await api.get('/carreras');
  return data;
}

// GET /api/estudiantes
export async function getEstudiantes() {
  const { data } = await api.get('/estudiantes');
  return data;
}

// GET /api/cursos
export async function getCursos() {
  const { data } = await api.get('/cursos');
  return data;
}

// GET /api/secciones
export async function getSecciones() {
  const { data } = await api.get('/secciones');
  return data;
}

// GET /api/asignaciones/:id_seccion -> estudiantes inscritos con su id_asignacion
export async function getAsignaciones(idSeccion) {
  const { data } = await api.get(`/asignaciones/${idSeccion}`);
  return data;
}

// GET /api/actividades/:id_seccion -> actividades evaluables de la seccion
export async function getActividades(idSeccion) {
  const { data } = await api.get(`/actividades/${idSeccion}`);
  return data;
}
