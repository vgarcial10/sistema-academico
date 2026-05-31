import api from './client';

// POST /api/asignaciones -> sp_AsignarEstudiante. Devuelve { exito, mensaje, id_asignacion }.
export async function asignarEstudiante({ id_seccion, id_estudiante }) {
  const { data } = await api.post('/asignaciones', { id_seccion, id_estudiante });
  return data;
}

// POST /api/cursos -> crea un curso. Devuelve { exito, mensaje, curso }.
export async function crearCurso({ id_carrera, codigo, nombre, creditos, ciclo_requerido }) {
  const { data } = await api.post('/cursos', { id_carrera, codigo, nombre, creditos, ciclo_requerido });
  return data;
}

// POST /api/notas -> sp_RegistrarNota. Devuelve { exito, mensaje, id_nota }.
export async function registrarNota({ id_asignacion, id_actividad, calificacion }) {
  const { data } = await api.post('/notas', { id_asignacion, id_actividad, calificacion });
  return data;
}

// POST /api/asistencia -> sp_RegistrarAsistencia. Devuelve { exito, mensaje, id_asistencia }.
export async function registrarAsistencia({ id_asignacion, fecha, estado }) {
  const { data } = await api.post('/asistencia', { id_asignacion, fecha, estado });
  return data;
}

// POST /api/auth/register -> sp de registro. Devuelve { exito, mensaje, id_usuario }.
export async function registrarUsuario({ id_rol, nombre, apellido, correo, contrasena }) {
  const { data } = await api.post('/auth/register', { id_rol, nombre, apellido, correo, contrasena });
  return data;
}
