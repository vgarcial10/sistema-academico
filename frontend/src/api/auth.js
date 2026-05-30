import api from './client';

// Llama a POST /api/auth/login y devuelve { mensaje, token, usuario }.
export async function login(correo, contrasena) {
  const { data } = await api.post('/auth/login', { correo, contrasena });
  return data;
}

// Extrae un mensaje de error legible desde una respuesta de axios.
export function getErrorMessage(err, fallback = 'Ocurrio un error inesperado') {
  return err?.response?.data?.error || err?.message || fallback;
}
