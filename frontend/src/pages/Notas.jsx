import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import GradeIcon from '@mui/icons-material/Grade';
import { getSecciones, getAsignaciones, getActividades } from '../api/catalogos';
import { registrarNota, crearActividad } from '../api/operaciones';
import { getErrorMessage } from '../api/auth';

const TIPOS_ACTIVIDAD = ['Parcial', 'Final', 'Tarea', 'Proyecto', 'Quiz', 'Laboratorio'];
const fmt = (v) => (v === null || v === undefined || v === '' ? '-' : v);
const fmtFecha = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-GT');
};

export default function Notas() {
  const [tab, setTab] = useState(0);
  const [secciones, setSecciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [idSeccion, setIdSeccion] = useState('');
  const [idSeccionAct, setIdSeccionAct] = useState('');
  const [idAsignacion, setIdAsignacion] = useState('');
  const [idActividad, setIdActividad] = useState('');
  const [calificacion, setCalificacion] = useState('');

  const [nombreAct, setNombreAct] = useState('');
  const [tipoAct, setTipoAct] = useState('Parcial');
  const [ponderacionAct, setPonderacionAct] = useState('');
  const [fechaEntregaAct, setFechaEntregaAct] = useState('');

  const [cargandoSeccion, setCargandoSeccion] = useState(false);
  const [cargandoActividades, setCargandoActividades] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviandoAct, setEnviandoAct] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackAct, setFeedbackAct] = useState(null);

  const cargarActividadesSeccion = useCallback((idSec, setLoading) => {
    if (!idSec) {
      setActividades([]);
      return Promise.resolve();
    }
    setLoading(true);
    return getActividades(idSec)
      .then(setActividades)
      .catch((err) => {
        const msg = getErrorMessage(err);
        if (tab === 0) setFeedback({ tipo: 'error', texto: msg });
        else setFeedbackAct({ tipo: 'error', texto: msg });
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    getSecciones()
      .then(setSecciones)
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }));
  }, []);

  useEffect(() => {
    if (!idSeccion) {
      setAsignaciones([]);
      if (tab === 0) setActividades([]);
      return;
    }
    setCargandoSeccion(true);
    setIdAsignacion('');
    setIdActividad('');
    Promise.all([
      getAsignaciones(idSeccion),
      tab === 0 ? getActividades(idSeccion) : Promise.resolve(null),
    ])
      .then(([asig, act]) => {
        setAsignaciones(asig);
        if (act) setActividades(act);
      })
      .catch((err) => setFeedback({ tipo: 'error', texto: getErrorMessage(err) }))
      .finally(() => setCargandoSeccion(false));
  }, [idSeccion, tab]);

  useEffect(() => {
    if (tab !== 1) return;
    setFeedbackAct(null);
    cargarActividadesSeccion(idSeccionAct, setCargandoActividades);
  }, [idSeccionAct, tab, cargarActividadesSeccion]);

  const handleSubmitNota = async (e) => {
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

  const handleSubmitActividad = async (e) => {
    e.preventDefault();
    setFeedbackAct(null);
    const pond = Number(ponderacionAct);
    if (Number.isNaN(pond) || pond <= 0 || pond > 100) {
      setFeedbackAct({ tipo: 'error', texto: 'La ponderación debe estar entre 0.01 y 100.' });
      return;
    }
    if (!nombreAct.trim()) {
      setFeedbackAct({ tipo: 'error', texto: 'El nombre de la actividad es obligatorio.' });
      return;
    }
    setEnviandoAct(true);
    try {
      const res = await crearActividad({
        id_seccion: Number(idSeccionAct),
        nombre: nombreAct.trim(),
        tipo: tipoAct,
        ponderacion: pond,
        fecha_entrega: fechaEntregaAct || null,
      });
      if (res?.exito === 0) {
        setFeedbackAct({ tipo: 'error', texto: res.mensaje || 'No se pudo crear la actividad.' });
      } else {
        setFeedbackAct({ tipo: 'success', texto: res?.mensaje || 'Actividad creada correctamente.' });
        setNombreAct('');
        setPonderacionAct('');
        setFechaEntregaAct('');
        await cargarActividadesSeccion(idSeccionAct, setCargandoActividades);
        if (idSeccion === idSeccionAct) {
          setIdActividad('');
        }
      }
    } catch (err) {
      setFeedbackAct({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo crear la actividad.') });
    } finally {
      setEnviandoAct(false);
    }
  };

  const formNotaValido = idSeccion && idAsignacion && idActividad && calificacion !== '';
  const formActValido = idSeccionAct && nombreAct.trim() && ponderacionAct !== '';

  const seccionSelect = (value, onChange, disabled) => (
    <TextField
      select
      fullWidth
      required
      label="Sección"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {secciones.map((s) => (
        <MenuItem key={s.id_seccion} value={String(s.id_seccion)}>
          {s.codigo_seccion} - {s.curso}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Paper sx={{ p: 3, maxWidth: 960 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <GradeIcon color="primary" />
        <Typography variant="h5">Registro de Notas</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Registrar nota" />
        <Tab label="Actividades" />
      </Tabs>

      {tab === 0 && (
        <>
          {feedback && (
            <Alert severity={feedback.tipo} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
              {feedback.texto}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmitNota}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {seccionSelect(idSeccion, (e) => setIdSeccion(e.target.value), false)}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Estudiante"
                  value={idAsignacion}
                  onChange={(e) => setIdAsignacion(e.target.value)}
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
                  select
                  fullWidth
                  required
                  label="Actividad"
                  value={idActividad}
                  onChange={(e) => setIdActividad(e.target.value)}
                  disabled={!idSeccion || cargandoSeccion}
                  helperText={idSeccion && !cargandoSeccion && actividades.length === 0 ? 'Sin actividades — créelas en la pestaña Actividades' : ' '}
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
                  fullWidth
                  required
                  type="number"
                  label="Calificacion (0-100)"
                  value={calificacion}
                  onChange={(e) => setCalificacion(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!formNotaValido || enviando}
                  startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {enviando ? 'Guardando...' : 'Registrar nota'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </>
      )}

      {tab === 1 && (
        <>
          {feedbackAct && (
            <Alert severity={feedbackAct.tipo} sx={{ mb: 2 }} onClose={() => setFeedbackAct(null)}>
              {feedbackAct.texto}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              {seccionSelect(idSeccionAct, (e) => setIdSeccionAct(e.target.value), false)}
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Actividades de la sección
          </Typography>
          {cargandoActividades ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : !idSeccionAct ? (
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Selecciona una sección para ver sus actividades.
            </Typography>
          ) : actividades.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Esta sección aún no tiene actividades. Crea una abajo.
            </Typography>
          ) : (
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ponderación %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fecha entrega</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actividades.map((a) => (
                    <TableRow key={a.id_actividad} hover>
                      <TableCell>{a.nombre}</TableCell>
                      <TableCell>{a.tipo}</TableCell>
                      <TableCell align="right">{fmt(a.ponderacion)}</TableCell>
                      <TableCell>{fmtFecha(a.fecha_entrega)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Nueva actividad
          </Typography>
          <Box component="form" onSubmit={handleSubmitActividad}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nombre"
                  value={nombreAct}
                  onChange={(e) => setNombreAct(e.target.value)}
                  disabled={!idSeccionAct || enviandoAct}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Tipo"
                  value={tipoAct}
                  onChange={(e) => setTipoAct(e.target.value)}
                  disabled={!idSeccionAct || enviandoAct}
                >
                  {TIPOS_ACTIVIDAD.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Ponderación (%)"
                  value={ponderacionAct}
                  onChange={(e) => setPonderacionAct(e.target.value)}
                  inputProps={{ min: 0.01, max: 100, step: 0.01 }}
                  disabled={!idSeccionAct || enviandoAct}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de entrega (opcional)"
                  value={fechaEntregaAct}
                  onChange={(e) => setFechaEntregaAct(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={!idSeccionAct || enviandoAct}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!formActValido || enviandoAct}
                  startIcon={enviandoAct ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {enviandoAct ? 'Guardando...' : 'Crear actividad'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </Paper>
  );
}
