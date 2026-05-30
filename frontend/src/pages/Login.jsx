import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Avatar, Box, Button, Alert, Paper, TextField, Typography, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/auth';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(correo.trim(), contrasena);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Credenciales incorrectas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #1565c0 0%, #00897b 100%)',
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: '100%', maxWidth: 410 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1.5 }}>
            <SchoolIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5">Sistema Academico</Typography>
          <Typography variant="body2" color="text.secondary">
            Inicia sesion para continuar
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Correo"
            type="email"
            fullWidth
            required
            margin="normal"
            autoComplete="email"
            autoFocus
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <TextField
            label="Contrasena"
            type={showPass ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass((v) => !v)} edge="end">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesion'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
