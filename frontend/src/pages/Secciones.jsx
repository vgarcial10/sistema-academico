import { Chip } from '@mui/material';
import DataTablePage from '../components/DataTablePage';
import { getSecciones } from '../api/catalogos';

const columns = [
  { key: 'codigo_seccion', label: 'Seccion' },
  { key: 'curso', label: 'Curso' },
  { key: 'docente', label: 'Docente' },
  { key: 'periodo', label: 'Periodo' },
  { key: 'horario', label: 'Horario' },
  { key: 'salon', label: 'Salon' },
  { key: 'cupo_maximo', label: 'Cupo' },
  {
    key: 'estado',
    label: 'Estado',
    render: (v) => (
      <Chip label={v} size="small" color={String(v).toLowerCase() === 'activa' ? 'success' : 'default'} />
    ),
  },
];

export default function Secciones() {
  return <DataTablePage titulo="Secciones" columns={columns} fetchFn={getSecciones} rowKey="id_seccion" />;
}
