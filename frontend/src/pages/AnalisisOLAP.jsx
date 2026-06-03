import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, IconButton, MenuItem, Paper, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Toolbar, Tooltip, Typography,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { getCarreras } from '../api/catalogos';
import { getCuboNotasPorCiclo } from '../api/analisis';
import { getErrorMessage } from '../api/auth';
import { exportarExcel, exportarPDF } from '../utils/exportar';
import {
  buildArbolCiclos,
  buildFilasTablaJerarquica,
  resumenCarrera,
  totalGeneral,
  aplanarArbolVisible,
  filasVistaPlana,
  COLUMNAS_EXPORT,
  COLUMNAS_EXPORT_PLANA,
} from '../utils/olapJerarquia';

const TODAS = 'TODAS';
const fmt = (v) => (v === null || v === undefined ? '-' : v);

const INDENT = 28;

function CeldaDimension({ fila }) {
  const pl = 1 + fila.depth * INDENT / 8;
  const chipColor = fila.tipo === 'ciclo' ? 'primary' : 'default';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', pl }}>
      {fila.canExpand ? (
        <IconButton size="small" sx={{ mr: 0.5 }} tabIndex={-1}>
          {fila.expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      ) : (
        <Box sx={{ width: 34, flexShrink: 0 }} />
      )}
      {fila.tipo === 'ciclo' ? (
        <Chip size="small" label={fila.dimension} color={chipColor} variant="outlined" />
      ) : (
        <Typography
          variant="body2"
          fontWeight={fila.bold ? 600 : 400}
          color={fila.tipo === 'estudiante' ? 'text.primary' : 'text.primary'}
        >
          {fila.dimension}
        </Typography>
      )}
    </Box>
  );
}

function TablaJerarquica({ filas, onToggle }) {
  if (filas.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        No hay datos de notas para los filtros seleccionados.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>Dimensión</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Carnet</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Estudiantes</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Promedio</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Notas</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filas.map((fila) => (
            <TableRow
              key={fila.key}
              hover={fila.canExpand}
              onClick={fila.canExpand ? () => onToggle(fila.expandKey) : undefined}
              sx={{
                cursor: fila.canExpand ? 'pointer' : 'default',
                bgcolor: fila.tipo === 'carrera' ? 'action.hover' : undefined,
              }}
            >
              <TableCell>
                <CeldaDimension fila={fila} />
              </TableCell>
              <TableCell>{fmt(fila.carnet)}</TableCell>
              <TableCell align="right">{fmt(fila.estudiantes)}</TableCell>
              <TableCell align="right">{fmt(fila.promedio)}</TableCell>
              <TableCell align="right">{fmt(fila.notas_registradas)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TablaPlana({ filas }) {
  if (filas.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        No hay filas del cubo para mostrar.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {COLUMNAS_EXPORT_PLANA.map((c) => (
              <TableCell key={c.key} sx={{ fontWeight: 700 }} align={c.key === 'estudiantes' || c.key === 'promedio' || c.key === 'notas_registradas' ? 'right' : 'left'}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filas.map((row, i) => (
            <TableRow
              key={`${row.carrera}-${row.ciclo}-${row.curso}-${row.carnet}-${i}`}
              hover
              sx={{ bgcolor: row.nivel_label === 'Total' ? 'action.selected' : undefined }}
            >
              {COLUMNAS_EXPORT_PLANA.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.key === 'estudiantes' || c.key === 'promedio' || c.key === 'notas_registradas' ? 'right' : 'left'}
                >
                  {fmt(row[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function AnalisisOLAP() {
  const [carreras, setCarreras] = useState([]);
  const [carreraSel, setCarreraSel] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [tab, setTab] = useState(0);

  const cargarCarreras = useCallback(() => {
    getCarreras()
      .then((data) => {
        setCarreras(data);
        if (!carreraSel && data.length > 0) {
          setCarreraSel(String(data[0].id_carrera));
        }
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [carreraSel]);

  const cargarCubo = useCallback(() => {
    setLoading(true);
    setError('');
    const idCarrera = carreraSel === TODAS ? null : Number(carreraSel);
    getCuboNotasPorCiclo(idCarrera)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [carreraSel]);

  useEffect(() => {
    cargarCarreras();
  }, [cargarCarreras]);

  useEffect(() => {
    if (carreraSel) cargarCubo();
  }, [carreraSel, cargarCubo]);

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: prev[key] === false }));
  };

  const carrerasEnDatos = useMemo(() => {
    const names = [...new Set(rows.filter((r) => r.nivel === 1).map((r) => r.carrera))];
    return names.sort((a, b) => String(a).localeCompare(String(b)));
  }, [rows]);

  const carreraNombreSel = useMemo(() => {
    if (carreraSel === TODAS) return TODAS;
    const c = carreras.find((x) => String(x.id_carrera) === String(carreraSel));
    return c?.nombre || '';
  }, [carreras, carreraSel]);

  const filasJerarquicas = useMemo(() => {
    const isExp = (key) => expanded[key] !== false;
    const enrich = (filas) =>
      filas.map((f) => ({
        ...f,
        expanded: f.expandKey ? isExp(f.expandKey) : false,
      }));

    if (carreraSel === TODAS) {
      return carrerasEnDatos.flatMap((nombre) =>
        enrich(
          buildFilasTablaJerarquica(
            buildArbolCiclos(rows, nombre),
            expanded,
            `carrera-${nombre}`,
            nombre,
            resumenCarrera(rows, nombre)
          )
        )
      );
    }
    if (!carreraNombreSel || carreraNombreSel === TODAS) return [];
    return enrich(
      buildFilasTablaJerarquica(
        buildArbolCiclos(rows, carreraNombreSel),
        expanded,
        `carrera-${carreraNombreSel}`,
        carreraNombreSel,
        resumenCarrera(rows, carreraNombreSel)
      )
    );
  }, [rows, carreraSel, carreraNombreSel, carrerasEnDatos, expanded]);

  const filasPlanas = useMemo(() => {
    if (carreraSel === TODAS) return filasVistaPlana(rows, TODAS);
    return filasVistaPlana(rows, carreraNombreSel);
  }, [rows, carreraSel, carreraNombreSel]);

  const datosExport = useMemo(() => {
    if (tab === 1) return filasPlanas;
    if (carreraSel === TODAS) {
      return carrerasEnDatos.flatMap((nombre) =>
        aplanarArbolVisible(buildArbolCiclos(rows, nombre), expanded, `carrera-${nombre}`)
      );
    }
    return aplanarArbolVisible(
      buildArbolCiclos(rows, carreraNombreSel),
      expanded,
      `carrera-${carreraNombreSel}`
    );
  }, [tab, rows, carreraSel, carreraNombreSel, carrerasEnDatos, expanded, filasPlanas]);

  const columnasExport = tab === 1 ? COLUMNAS_EXPORT_PLANA : COLUMNAS_EXPORT;
  const total = totalGeneral(rows);

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <BarChartIcon color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Sistema Académico UMG 2026 — Consolidado por ciclos
        </Typography>
        <TextField
          select
          size="small"
          label="Carrera"
          value={carreraSel}
          onChange={(e) => setCarreraSel(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value={TODAS}>Todas las carreras</MenuItem>
          {carreras.map((c) => (
            <MenuItem key={c.id_carrera} value={String(c.id_carrera)}>
              {c.nombre}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title="Recargar">
          <IconButton onClick={cargarCubo}><RefreshIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Exportar Excel">
          <span>
            <IconButton
              color="success"
              disabled={datosExport.length === 0}
              onClick={() => exportarExcel('Consolidado_UMG_2026', columnasExport, datosExport)}
            >
              <GridOnIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <span>
            <IconButton
              color="error"
              disabled={datosExport.length === 0}
              onClick={() => exportarPDF('Consolidado Académico UMG 2026', columnasExport, datosExport)}
            >
              <PictureAsPdfIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Toolbar>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Jerárquica" />
        <Tab label="Plana" />
      </Tabs>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {tab === 0
          ? 'Consolidado académico con columnas fijas. Expande Carrera → Ciclo → Curso → Estudiante.'
          : 'Todas las filas del consolidado (totales, subtotales y detalle) en formato tabular.'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {total && (carreraSel === TODAS || tab === 1) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>TOTAL GENERAL:</strong> Estudiantes {fmt(total.estudiantes)} | Promedio {fmt(total.promedio)} | Notas {fmt(total.notas_registradas)}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <TablaJerarquica filas={filasJerarquicas} onToggle={toggle} />
      ) : (
        <TablaPlana filas={filasPlanas} />
      )}
    </Paper>
  );
}
