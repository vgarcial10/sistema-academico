import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Tab, Tabs, TextField, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { getSecciones } from '../api/catalogos';
import { getReporteNotas, getReporteAsistencia } from '../api/reportes';
import { getErrorMessage } from '../api/auth';
import { exportarExcel, exportarPDF } from '../utils/exportar';

const fmt = (v) => (v === null || v === undefined ? '-' : v);

const colorNota = (estado) => {
  const e = String(estado).toLowerCase();
  if (e.includes('riesgo') || e.includes('reprob')) return 'error';
  if (e.includes('aprob')) return 'success';
  return 'default';
};
const colorAsis = (estado) => (String(estado).toUpperCase() === 'ALERTA' ? 'error' : String(estado).toLowerCase() === 'normal' ? 'success' : 'default');

const columnsNotas = [
  { key: 'carnet', label: 'Carnet' },
  { key: 'estudiante', label: 'Estudiante' },
  { key: 'actividades_registradas', label: 'Actividades' },
  { key: 'promedio_ponderado', label: 'Prom. ponderado', render: (r) => fmt(r.promedio_ponderado) },
  { key: 'promedio_simple', label: 'Prom. simple', render: (r) => fmt(r.promedio_simple) },
  { key: 'nota_minima', label: 'Min', render: (r) => fmt(r.nota_minima) },
  { key: 'nota_maxima', label: 'Max', render: (r) => fmt(r.nota_maxima) },
  { key: 'estado_academico', label: 'Estado', render: (r) => <Chip size="small" label={r.estado_academico} color={colorNota(r.estado_academico)} /> },
];

const columnsAsistencia = [
  { key: 'carnet', label: 'Carnet' },
  { key: 'estudiante', label: 'Estudiante' },
  { key: 'total_clases', label: 'Clases' },
  { key: 'presentes', label: 'Presentes' },
  { key: 'ausentes', label: 'Ausentes' },
  { key: 'justificados', label: 'Justif.' },
  { key: 'tardanzas', label: 'Tard.' },
  { key: 'pct_asistencia', label: '% Asistencia', render: (r) => (r.pct_asistencia == null ? '-' : `${r.pct_asistencia}%`) },
  { key: 'estado_asistencia', label: 'Estado', render: (r) => <Chip size="small" label={r.estado_asistencia} color={colorAsis(r.estado_asistencia)} /> },
];

function Tabla({ columns, rows }) {
  if (rows.length === 0) {
    return <Typography color="text.secondary" sx={{ p: 3 }}>No hay datos para esta seccion.</Typography>;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.carnet}-${i}`} hover>
              {columns.map((c) => <TableCell key={c.key}>{c.render ? c.render(row) : fmt(row[c.key])}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function Reportes() {
  const [secciones, setSecciones] = useState([]);
  const [idSeccion, setIdSeccion] = useState('');
  const [tab, setTab] = useState(0);
  const [notas, setNotas] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSecciones().then(setSecciones).catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!idSeccion) {
      setNotas([]);
      setAsistencia([]);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([getReporteNotas(idSeccion), getReporteAsistencia(idSeccion)])
      .then(([n, a]) => {
        setNotas(Array.isArray(n) ? n : []);
        setAsistencia(Array.isArray(a) ? a : []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [idSeccion]);

  const seccionSel = secciones.find((s) => s.id_seccion === idSeccion);
  const sufijo = seccionSel ? seccionSel.codigo_seccion : 'seccion';
  const activo = tab === 0
    ? { nombre: `Reporte_Notas_${sufijo}`, columns: columnsNotas, rows: notas }
    : { nombre: `Reporte_Asistencia_${sufijo}`, columns: columnsAsistencia, rows: asistencia };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <AssessmentIcon color="primary" />
        <Typography variant="h5">Reportes por seccion</Typography>
      </Box>

      <TextField
        select label="Seccion" value={idSeccion} onChange={(e) => setIdSeccion(e.target.value)}
        sx={{ minWidth: 280, mb: 2 }}
      >
        {secciones.map((s) => (
          <MenuItem key={s.id_seccion} value={s.id_seccion}>
            {s.codigo_seccion} - {s.curso}
          </MenuItem>
        ))}
      </TextField>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!idSeccion ? (
        <Typography color="text.secondary">Selecciona una seccion para ver sus reportes.</Typography>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ flexGrow: 1 }}>
              <Tab label={`Notas (${notas.length})`} />
              <Tab label={`Asistencia (${asistencia.length})`} />
            </Tabs>
            <Button
              size="small" color="success" startIcon={<GridOnIcon />}
              disabled={activo.rows.length === 0}
              onClick={() => exportarExcel(activo.nombre, activo.columns, activo.rows)}
            >
              Excel
            </Button>
            <Button
              size="small" color="error" startIcon={<PictureAsPdfIcon />}
              disabled={activo.rows.length === 0}
              onClick={() => exportarPDF(activo.nombre, activo.columns, activo.rows)}
              sx={{ ml: 1 }}
            >
              PDF
            </Button>
          </Box>
          {tab === 0 && <Tabla columns={columnsNotas} rows={notas} />}
          {tab === 1 && <Tabla columns={columnsAsistencia} rows={asistencia} />}
        </>
      )}
    </Paper>
  );
}
