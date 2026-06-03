import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, Collapse, IconButton, List, ListItemButton,
  ListItemText, MenuItem, Paper, TextField, Toolbar, Tooltip, Typography,
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
  resumenCarrera,
  totalGeneral,
  aplanarArbolVisible,
  COLUMNAS_EXPORT,
} from '../utils/olapJerarquia';

const TODAS = 'TODAS';
const fmt = (v) => (v === null || v === undefined ? '-' : v);

function Metricas({ row }) {
  if (!row) return null;
  return (
    <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
      {`Est: ${fmt(row.estudiantes)} | Prom: ${fmt(row.promedio)} | Notas: ${fmt(row.notas_registradas)}`}
    </Typography>
  );
}

function NodoCiclo({ cicloNode, expanded, onToggle, depth, keyPrefix }) {
  const kCiclo = `${keyPrefix}-ciclo-${cicloNode.ciclo}`;
  const open = expanded[kCiclo] !== false;

  return (
    <>
      <ListItemButton sx={{ pl: depth }} onClick={() => onToggle(kCiclo)}>
        <IconButton size="small" edge="start" tabIndex={-1}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" label={`Ciclo ${cicloNode.ciclo}`} color="primary" variant="outlined" />
              <Metricas row={cicloNode.meta} />
            </Box>
          }
        />
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <List disablePadding>
          {cicloNode.cursos.map((cursoNode) => (
            <NodoCurso
              key={`${kCiclo}-${cursoNode.curso}`}
              cursoNode={cursoNode}
              kCiclo={kCiclo}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 3}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

function NodoCurso({ cursoNode, kCiclo, expanded, onToggle, depth }) {
  const kCurso = `${kCiclo}-curso-${cursoNode.curso}`;
  const open = expanded[kCurso] !== false;

  return (
    <>
      <ListItemButton sx={{ pl: depth }} onClick={() => onToggle(kCurso)}>
        <IconButton size="small" edge="start" tabIndex={-1}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>{cursoNode.curso}</Typography>
              <Metricas row={cursoNode.meta} />
            </Box>
          }
        />
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <List disablePadding>
          {cursoNode.estudiantes.map((est) => (
            <ListItemButton key={`${kCurso}-${est.carnet}`} sx={{ pl: depth + 3 }} disabled>
              <ListItemText
                primary={est.estudiante}
                secondary={`Carnet: ${est.carnet} | Promedio: ${fmt(est.promedio)} | Notas: ${fmt(est.notas_registradas)}`}
              />
            </ListItemButton>
          ))}
          {cursoNode.estudiantes.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ pl: depth + 3, py: 1 }}>
              Sin estudiantes con notas en este curso.
            </Typography>
          )}
        </List>
      </Collapse>
    </>
  );
}

function ArbolCarrera({ rows, carreraNombre, expanded, onToggle }) {
  const ciclos = useMemo(
    () => buildArbolCiclos(rows, carreraNombre),
    [rows, carreraNombre]
  );
  const resumen = resumenCarrera(rows, carreraNombre);
  const kCarrera = `carrera-${carreraNombre}`;
  const openCarrera = expanded[kCarrera] !== false;

  return (
    <Box sx={{ mb: 2 }}>
      <ListItemButton onClick={() => onToggle(kCarrera)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
        <IconButton size="small" edge="start" tabIndex={-1}>
          {openCarrera ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <ListItemText
          primary={
            <Typography variant="subtitle1" fontWeight={700}>
              {carreraNombre}
              <Metricas row={resumen} />
            </Typography>
          }
        />
      </ListItemButton>
      <Collapse in={openCarrera} unmountOnExit>
        <List disablePadding>
          {ciclos.length === 0 ? (
            <Typography color="text.secondary" sx={{ pl: 4, py: 2 }}>
              No hay datos de notas para esta carrera.
            </Typography>
          ) : (
            ciclos.map((cicloNode) => (
            <NodoCiclo
              key={`${carreraNombre}-ciclo-${cicloNode.ciclo}`}
              cicloNode={cicloNode}
              expanded={expanded}
              onToggle={onToggle}
              depth={2}
              keyPrefix={`carrera-${carreraNombre}`}
            />
            ))
          )}
        </List>
      </Collapse>
    </Box>
  );
}

export default function AnalisisOLAP() {
  const [carreras, setCarreras] = useState([]);
  const [carreraSel, setCarreraSel] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

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

  const arbolesExport = useMemo(() => {
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
  }, [rows, carreraSel, carreraNombreSel, carrerasEnDatos, expanded]);

  const total = totalGeneral(rows);

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <BarChartIcon color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Análisis Multidimensional (OLAP) — Notas por ciclo
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
              disabled={arbolesExport.length === 0}
              onClick={() => exportarExcel('OLAP_Notas_Ciclo', COLUMNAS_EXPORT, arbolesExport)}
            >
              <GridOnIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <span>
            <IconButton
              color="error"
              disabled={arbolesExport.length === 0}
              onClick={() => exportarPDF('OLAP Notas por ciclo', COLUMNAS_EXPORT, arbolesExport)}
            >
              <PictureAsPdfIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Toolbar>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Jerarquía del cubo: Carrera → Ciclo del plan de estudios → Curso → Estudiante.
        Expande cada nivel para ver el avance de notas por ciclo académico.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {total && carreraSel === TODAS && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>TOTAL GENERAL:</strong> Estudiantes {fmt(total.estudiantes)} | Promedio {fmt(total.promedio)} | Notas {fmt(total.notas_registradas)}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : carreraSel === TODAS ? (
        carrerasEnDatos.map((nombre) => (
          <ArbolCarrera
            key={nombre}
            rows={rows}
            carreraNombre={nombre}
            expanded={expanded}
            onToggle={toggle}
          />
        ))
      ) : carreraNombreSel ? (
        <ArbolCarrera
          rows={rows}
          carreraNombre={carreraNombreSel}
          expanded={expanded}
          onToggle={toggle}
        />
      ) : (
        <Typography color="text.secondary">Selecciona una carrera.</Typography>
      )}
    </Paper>
  );
}
