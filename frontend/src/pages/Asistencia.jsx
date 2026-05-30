import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { getSecciones, getAsignaciones } from '../api/catalogos';
import { registrarAsistencia } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

const ESTADOS = ['Presente', 'Ausente', 'Justificado', 'Tardanza'];
const hoy = () => new Date().toISOString().slice(0, 10);

export default function Asistencia() {
  const [secciones, setSecciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);

  const [idSeccion, setIdSeccion] = useState('');
  const [idAsignacion, setIdAsignacion] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [estado, setEstado] = useState('Presente');

  const [cargandoSeccion, setCargandoSeccion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    getSecciones()
      .then(setSecciones)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }));
  }, []);

  useEffect(() => {
    if (!idSeccion) {
      setAsignaciones([]);
      return;
    }
    setCargandoSeccion(true);
    setIdAsignacion('');
    getAsignaciones(idSeccion)
      .then(setAsignaciones)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }))
      .finally(() => setCargandoSeccion(false));
  }, [idSeccion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setEnviando(true);
    try {
      const res = await registrarAsistencia({
        id_asignacion: Number(idAsignacion),
        fecha,
        estado,
      });
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo registrar la asistencia.' });
      } else {
        setFeedback({ tipo: 'success', texto: res?.mensaje || 'Asistencia registrada correctamente.' });
      }
    } catch (err) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo registrar la asistencia.') });
    } finally {
      setEnviando(false);
    }
  };

  const formValido = idSeccion && idAsignacion && fecha && estado;

  return (
    <Paper sx={{ p: 3, maxWidth: 720 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <FactCheckIcon color="primary" />
        <Typography variant="h5">Registro de Asistencia</Typography>
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

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth required type="date" label="Fecha"
              value={fecha} onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              select fullWidth required label="Estado"
              value={estado} onChange={(e) => setEstado(e.target.value)}
            >
              {ESTADOS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit" variant="contained" size="large"
              disabled={!formValido || enviando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {enviando ? 'Guardando...' : 'Registrar asistencia'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
