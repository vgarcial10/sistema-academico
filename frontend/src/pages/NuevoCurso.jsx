import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { getCarreras } from '../api/catalogos';
import { crearCurso } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

export default function NuevoCurso() {
  const [carreras, setCarreras] = useState([]);
  const [idCarrera, setIdCarrera] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [creditos, setCreditos] = useState('');
  const [cicloRequerido, setCicloRequerido] = useState('');

  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setCargando(true);
    getCarreras()
      .then(setCarreras)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }))
      .finally(() => setCargando(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const creditosNum = Number(creditos);
    const cicloNum = Number(cicloRequerido);
    if (!Number.isInteger(creditosNum) || creditosNum < 1 || creditosNum > 12) {
      setFeedback({ tipo: 'error', texto: 'Los créditos deben estar entre 1 y 12.' });
      return;
    }
    if (!Number.isInteger(cicloNum) || cicloNum < 1 || cicloNum > 12) {
      setFeedback({ tipo: 'error', texto: 'El ciclo requerido debe estar entre 1 y 12.' });
      return;
    }

    setEnviando(true);
    try {
      const res = await crearCurso({
        id_carrera: Number(idCarrera),
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        creditos: creditosNum,
        ciclo_requerido: cicloNum,
      });
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res.mensaje || 'No se pudo crear el curso.' });
      } else {
        setFeedback({ tipo: 'success', texto: res?.mensaje || 'Curso creado correctamente.' });
        setCodigo('');
        setNombre('');
        setCreditos('');
        setCicloRequerido('');
      }
    } catch (err) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo crear el curso.') });
    } finally {
      setEnviando(false);
    }
  };

  const formValido = idCarrera && codigo.trim() && nombre.trim() && creditos !== '' && cicloRequerido !== '';

  return (
    <Paper sx={{ p: 3, maxWidth: 760 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <MenuBookIcon color="primary" />
        <Typography variant="h5">Crear curso</Typography>
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
              label="Carrera"
              value={idCarrera}
              onChange={(e) => setIdCarrera(e.target.value)}
              disabled={cargando || enviando}
            >
              {carreras.map((c) => (
                <MenuItem key={c.id_carrera} value={c.id_carrera}>
                  {c.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              required
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={enviando}
              inputProps={{ maxLength: 20 }}
            />
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              required
              label="Nombre del curso"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={enviando}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="number"
              label="Créditos"
              value={creditos}
              onChange={(e) => setCreditos(e.target.value)}
              disabled={enviando}
              inputProps={{ min: 1, max: 12, step: 1 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="number"
              label="Ciclo requerido"
              value={cicloRequerido}
              onChange={(e) => setCicloRequerido(e.target.value)}
              disabled={enviando}
              inputProps={{ min: 1, max: 12, step: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!formValido || enviando || cargando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {enviando ? 'Guardando...' : 'Crear curso'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
