import { Chip, Tooltip, Typography } from '@mui/material';
import DataTablePage from '../components/DataTablePage';
import { getAuditoria } from '../api/auditoria';

const colorAccion = (accion) => {
  switch (accion) {
    case 'INSERT': return 'success';
    case 'UPDATE': return 'info';
    case 'DELETE': return 'error';
    case 'ERROR': return 'error';
    case 'LOGIN': return 'primary';
    default: return 'default';
  }
};

const fmtFecha = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

// Muestra un JSON compacto y truncado, con el contenido completo en el tooltip.
const Datos = ({ value }) => {
  if (!value) return <span>-</span>;
  const texto = String(value);
  const corto = texto.length > 60 ? `${texto.slice(0, 60)}...` : texto;
  return (
    <Tooltip title={texto}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', cursor: 'help' }}>{corto}</Typography>
    </Tooltip>
  );
};

const columns = [
  { key: 'fecha_hora', label: 'Fecha/Hora', render: (v) => fmtFecha(v) },
  { key: 'usuario', label: 'Usuario', render: (v) => v || 'Sistema' },
  { key: 'accion', label: 'Accion', render: (v) => <Chip label={v} size="small" color={colorAccion(v)} /> },
  { key: 'tabla_afectada', label: 'Tabla' },
  { key: 'id_registro_afectado', label: 'Registro', render: (v) => v ?? '-' },
  { key: 'datos_nuevos', label: 'Datos nuevos', render: (v) => <Datos value={v} /> },
];

export default function Auditoria() {
  return <DataTablePage titulo="Auditoria del sistema" columns={columns} fetchFn={getAuditoria} rowKey="id_bitacora" />;
}
