import { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, CircularProgress, Divider, Grid, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../context/AuthContext';
import { getEstudiantes } from '../api/catalogos';
import { getPerfil } from '../api/perfil';
import { getErrorMessage } from '../api/auth';
import ChatIA from '../components/ChatIA';

const SUGERENCIAS = ['Cual es mi promedio?', 'Tengo alertas de riesgo?', 'Como va mi asistencia?'];

function Dato({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value ?? '-'}</Typography>
    </Grid>
  );
}

export default function Perfil() {
  const { usuario } = useAuth();
  const [idEstudiante, setIdEstudiante] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Identificar al estudiante logueado emparejando por nombre_completo.
  useEffect(() => {
    setLoading(true);
    setError('');
    getEstudiantes()
      .then((lista) => {
        const match = lista.find((e) => e.nombre_completo === usuario?.nombre_completo) || null;
        if (!match) {
          setError('No se pudo identificar tu registro de estudiante.');
          setLoading(false);
          return null;
        }
        setIdEstudiante(match.id_estudiante);
        return getPerfil(match.id_estudiante);
      })
      .then((data) => { if (data) setPerfil(data); })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [usuario]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const d = perfil?.datos || {};
  const secciones = perfil?.secciones || [];
  const alertas = perfil?.alertas || [];

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}><PersonIcon /></Avatar>
          <Box>
            <Typography variant="h5">{d.nombre_completo}</Typography>
            <Typography variant="body2" color="text.secondary">{d.carrera}</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Dato label="Carnet" value={d.carnet} />
          <Dato label="Correo" value={d.correo} />
          <Dato label="Ciclo actual" value={d.ciclo_actual} />
          <Dato label="Estado academico" value={d.estado_academico} />
          <Dato label="Fecha de ingreso" value={d.fecha_ingreso?.slice?.(0, 10)} />
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Mis secciones</Typography>
        {secciones.length === 0 ? (
          <Typography color="text.secondary">No estas inscrito en secciones activas.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Curso', 'Seccion', 'Horario', 'Docente', 'Periodo', 'Promedio', 'Estado'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {secciones.map((s, i) => (
                  <TableRow key={`${s.codigo_seccion}-${i}`} hover>
                    <TableCell>{s.curso}</TableCell>
                    <TableCell>{s.codigo_seccion}</TableCell>
                    <TableCell>{s.horario}</TableCell>
                    <TableCell>{s.docente}</TableCell>
                    <TableCell>{s.periodo}</TableCell>
                    <TableCell>{s.promedio_actual ?? '-'}</TableCell>
                    <TableCell>{s.estado_asignacion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <WarningAmberIcon color={alertas.length ? 'error' : 'disabled'} />
          <Typography variant="h6">Alertas academicas</Typography>
        </Box>
        {alertas.length === 0 ? (
          <Typography color="text.secondary">No tienes alertas activas. Vas bien.</Typography>
        ) : (
          <Stack spacing={1}>
            {alertas.map((a, i) => (
              <Alert key={i} severity="warning">
                <strong>{a.tipo_alerta}:</strong> {a.descripcion}
              </Alert>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SmartToyIcon color="secondary" />
          <Typography variant="h6">Asistente academico</Typography>
        </Box>
        <ChatIA
          idEstudiante={idEstudiante}
          sugerencias={SUGERENCIAS}
          saludo="Hola, soy tu asistente academico. Preguntame por tu promedio, riesgo o asistencia."
          altura={280}
        />
      </Paper>
    </Stack>
  );
}
