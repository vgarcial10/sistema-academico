import { Chip } from '@mui/material';
import DataTablePage from '../components/DataTablePage';
import { getMonitoreoConsultas } from '../api/monitoreo';

const fmtFecha = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const estadoChip = (exito) => {
  if (exito === true || exito === 1) return <Chip size="small" label="OK" color="success" />;
  if (exito === false || exito === 0) return <Chip size="small" label="ERROR" color="error" />;
  return <Chip size="small" label="-" />;
};

const columns = [
  { key: 'id_monitoreo', label: '#' },
  { key: 'tipo_operacion', label: 'Tipo' },
  { key: 'nombre_consulta', label: 'Consulta' },
  { key: 'duracion_ms', label: 'Duración (ms)' },
  { key: 'exito', label: 'Estado', render: (v) => estadoChip(v) },
  { key: 'fecha_inicio', label: 'Inicio', render: (v) => fmtFecha(v) },
  { key: 'fecha_fin', label: 'Fin', render: (v) => fmtFecha(v) },
  { key: 'resumen_consulta', label: 'Resumen SQL/SP' },
  { key: 'mensaje_error', label: 'Error', render: (v) => v || '-' },
];

export default function MonitoreoConsultas() {
  return (
    <DataTablePage
      titulo="Monitoreo de tiempos de consultas"
      columns={columns}
      fetchFn={getMonitoreoConsultas}
      rowKey="id_monitoreo"
    />
  );
}
