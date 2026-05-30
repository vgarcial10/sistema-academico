import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest } from '../api/auth';
import { STORAGE_TOKEN, STORAGE_USER } from '../api/client';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN));
  const [usuario, setUsuario] = useState(() => readStoredUser());

  // Mantiene la sesion sincronizada entre pestanas del navegador.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_TOKEN) setToken(e.newValue);
      if (e.key === STORAGE_USER) setUsuario(readStoredUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function login(correo, contrasena) {
    const data = await loginRequest(correo, contrasena);
    localStorage.setItem(STORAGE_TOKEN, data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    return data;
  }

  function logout() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUsuario(null);
  }

  // Verifica si el usuario actual tiene alguno de los roles indicados.
  function hasRole(...roles) {
    if (roles.length === 0) return true;
    return roles.includes(usuario?.nombre_rol);
  }

  const value = useMemo(
    () => ({ token, usuario, isAuthenticated: Boolean(token), login, logout, hasRole }),
    [token, usuario]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
