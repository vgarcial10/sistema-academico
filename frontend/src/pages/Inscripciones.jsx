import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { getSecciones, getEstudiantes } from '../api/catalogos';
import { asignarEstudiante } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

export default function Inscripciones() {
  const [secciones, setSecciones] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);

  const [idSeccion, setIdSeccion] = useState('');
  const [idEstudiante, setIdEstudiante] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setCargando(true);
    Promise.all([getSecciones(), getEstudiantes()])
      .then(([sec, est]) => {
        setSecciones(sec);
        setEstudiantes(est);
      })
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }))
      .finally(() => setCargando(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setEnviando(true);
    try {
      const res = await asignarEstudiante({
        id_seccion: Number(idSeccion),
        id_estudiante: Number(idEstudiante),
      });
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo realizar la inscripción.' });
      } else {
        setFeedback({ tipo: 'success', texto: res?.mensaje || 'Inscripción realizada correctamente.' });
        setIdEstudiante('');
      }
    } catch (err) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo realizar la inscripción.') });
    } finally {
      setEnviando(false);
    }
  };

  const formValido = idSeccion && idEstudiante;

  return (
    <Paper sx={{ p: 3, maxWidth: 760 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <HowToRegIcon color="primary" />
        <Typography variant="h5">Inscribir estudiante en sección</Typography>
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
              select
              fullWidth
              required
              label="Sección"
              value={idSeccion}
              onChange={(e) => setIdSeccion(e.target.value)}
              disabled={cargando || enviando}
            >
              {secciones.map((s) => (
                <MenuItem key={s.id_seccion} value={s.id_seccion}>
                  {s.codigo_seccion} - {s.curso}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              required
              label="Estudiante"
              value={idEstudiante}
              onChange={(e) => setIdEstudiante(e.target.value)}
              disabled={cargando || enviando}
            >
              {estudiantes.map((e) => (
                <MenuItem key={e.id_estudiante} value={e.id_estudiante}>
                  {e.carnet} - {e.nombre_completo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!formValido || enviando || cargando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {enviando ? 'Inscribiendo...' : 'Inscribir estudiante'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
