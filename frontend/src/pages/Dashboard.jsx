import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardActionArea, CardContent, Grid, Paper, Typography, Chip, Avatar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { menuForRole } from '../config/menu';

const descripciones = {
  Administrador: 'Tienes acceso completo: gestion academica, reportes y auditoria del sistema.',
  Docente: 'Registra notas y asistencia, y consulta los reportes de tus secciones.',
  Estudiante: 'Consulta tu perfil academico, tus notas y tu asistencia.',
  Reportes: 'Consulta los reportes academicos del sistema.',
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Accesos directos = items del menu del rol, excluyendo el propio Dashboard.
  const accesos = menuForRole(usuario?.nombre_rol).filter((item) => item.path !== '/');

  const initials = (usuario?.nombre_completo || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{initials}</Avatar>
        <Box>
          <Typography variant="h5">Bienvenido, {usuario?.nombre_completo}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip label={usuario?.nombre_rol} color="secondary" size="small" />
            <Typography variant="body2" color="text.secondary">
              {descripciones[usuario?.nombre_rol] || 'Bienvenido al Sistema Academico.'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>Accesos rapidos</Typography>
      <Grid container spacing={2}>
        {accesos.map((item) => {
          const Icon = item.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={item.path}>
              <Card>
                <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <Icon />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={600}>{item.label}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
