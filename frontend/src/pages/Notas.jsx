import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import GradeIcon from '@mui/icons-material/Grade';
import { getSecciones, getAsignaciones, getActividades } from '../api/catalogos';
import { registrarNota } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

export default function Notas() {
  const [secciones, setSecciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [idSeccion, setIdSeccion] = useState('');
  const [idAsignacion, setIdAsignacion] = useState('');
  const [idActividad, setIdActividad] = useState('');
  const [calificacion, setCalificacion] = useState('');

  const [cargandoSeccion, setCargandoSeccion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo, texto }

  useEffect(() => {
    getSecciones()
      .then(setSecciones)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }));
  }, []);

  // Al elegir seccion, cargar sus estudiantes inscritos y actividades.
  useEffect(() => {
    if (!idSeccion) {
      setAsignaciones([]);
      setActividades([]);
      return;
    }
    setCargandoSeccion(true);
    setIdAsignacion('');
    setIdActividad('');
    Promise.all([getAsignaciones(idSeccion), getActividades(idSeccion)])
      .then(([asig, act]) => {
        setAsignaciones(asig);
        setActividades(act);
      })
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }))
      .finally(() => setCargandoSeccion(false));
  }, [idSeccion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const nota = Number(calificacion);
    if (Number.isNaN(nota) || nota < 0 || nota > 100) {
      setFeedback({ tipo: 'error', texto: 'La calificacion debe estar entre 0 y 100.' });
      return;
    }
    setEnviando(true);
    try {
      const res = await registrarNota({
        id_asignacion: Number(idAsignacion),
        id_actividad: Number(idActividad),
        calificacion: nota,
      });
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo registrar la nota.' });
      } else {
        setFeedback({ tipo: 'success', texto: res?.mensaje || 'Nota registrada correctamente.' });
        setCalificacion('');
      }
    } catch (err) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo registrar la nota.') });
    } finally {
      setEnviando(false);
    }
  };

  const formValido = idSeccion && idAsignacion && idActividad && calificacion !== '';

  return (
    <Paper sx={{ p: 3, maxWidth: 720 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <GradeIcon color="primary" />
        <Typography variant="h5">Registro de Notas</Typography>
      </Box>

      {feedback && (
        <Alert severity={feedback.tipo} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.texto}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              select fullWidth required label="Seccion"
              value={idSeccion} onChange={(e) => setIdSeccion(e.target.value)}
            >
              {secciones.map((s) => (
                <MenuItem key={s.id_seccion} value={s.id_seccion}>
                  {s.codigo_seccion} - {s.curso}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth required label="Estudiante"
              value={idAsignacion} onChange={(e) => setIdAsignacion(e.target.value)}
              disabled={!idSeccion || cargandoSeccion}
              helperText={idSeccion && !cargandoSeccion && asignaciones.length === 0 ? 'Sin estudiantes inscritos' : ' '}
            >
              {asignaciones.map((a) => (
                <MenuItem key={a.id_asignacion} value={a.id_asignacion}>
                  {a.carnet} - {a.nombre_completo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth required label="Actividad"
              value={idActividad} onChange={(e) => setIdActividad(e.target.value)}
              disabled={!idSeccion || cargandoSeccion}
              helperText={idSeccion && !cargandoSeccion && actividades.length === 0 ? 'Sin actividades' : ' '}
            >
              {actividades.map((a) => (
                <MenuItem key={a.id_actividad} value={a.id_actividad}>
                  {a.nombre} ({a.ponderacion}%)
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth required type="number" label="Calificacion (0-100)"
              value={calificacion} onChange={(e) => setCalificacion(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit" variant="contained" size="large"
              disabled={!formValido || enviando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {enviando ? 'Guardando...' : 'Registrar nota'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
