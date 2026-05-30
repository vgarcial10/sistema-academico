import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { getRoles } from '../api/catalogos';
import { registrarUsuario } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

const FORM_VACIO = { id_rol: '', nombre: '', apellido: '', correo: '', contrasena: '', confirmar: '' };

export default function RegistroUsuario() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }));
  }, []);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const validar = () => {
    if (!form.id_rol) return 'Selecciona un rol.';
    if (!form.nombre.trim() || !form.apellido.trim()) return 'Nombre y apellido son obligatorios.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) return 'El correo no tiene un formato valido.';
    if (form.contrasena.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
    if (form.contrasena !== form.confirmar) return 'Las contrasenas no coinciden.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const err = validar();
    if (err) {
      setFeedback({ tipo: 'error', texto: err });
      return;
    }
    setEnviando(true);
    try {
      const res = await registrarUsuario({
        id_rol: Number(form.id_rol),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
      });
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo registrar el usuario.' });
      } else {
        setFeedback({ tipo: 'success', texto: res?.mensaje || 'Usuario registrado correctamente.' });
        setForm(FORM_VACIO);
      }
    } catch (e2) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(e2, 'No se pudo registrar el usuario.') });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 640 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <PersonAddIcon color="primary" />
        <Typography variant="h5">Registrar usuario</Typography>
      </Box>

      {feedback && (
        <Alert severity={feedback.tipo} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.texto}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField select fullWidth required label="Rol" value={form.id_rol} onChange={set('id_rol')}>
              {roles.map((r) => (
                <MenuItem key={r.id_rol} value={r.id_rol}>{r.nombre}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth required label="Nombre" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth required label="Apellido" value={form.apellido} onChange={set('apellido')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth required type="email" label="Correo" value={form.correo} onChange={set('correo')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth required type="password" label="Contrasena"
              value={form.contrasena} onChange={set('contrasena')}
              helperText="Minimo 6 caracteres"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth required type="password" label="Confirmar contrasena"
              value={form.confirmar} onChange={set('confirmar')}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit" variant="contained" size="large"
              disabled={enviando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {enviando ? 'Registrando...' : 'Registrar usuario'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
