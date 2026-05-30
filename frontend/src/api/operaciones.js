import api from './client';

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
