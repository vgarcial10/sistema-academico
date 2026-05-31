import { Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DataTablePage from '../components/DataTablePage';
import { getEstudiantes } from '../api/catalogos';

const estadoColor = (estado) => {
  const e = String(estado).toLowerCase();
  if (e.includes('riesgo')) return 'error';
  if (e.includes('activo')) return 'success';
  return 'default';
};

const columns = [
  { key: 'carnet', label: 'Carnet' },
  { key: 'nombre_completo', label: 'Nombre' },
  { key: 'correo', label: 'Correo' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'ciclo_actual', label: 'Ciclo' },
  {
    key: 'estado_academico',
    label: 'Estado',
    render: (v) => <Chip label={v} size="small" color={estadoColor(v)} />,
  },
];

export default function Estudiantes() {
  const navigate = useNavigate();
  return (
    <DataTablePage
      titulo="Estudiantes"
      columns={columns}
      fetchFn={getEstudiantes}
      rowKey="id_estudiante"
      headerActions={(
        <Button variant="contained" size="small" onClick={() => navigate('/inscripciones')}>
          Inscribir estudiante
        </Button>
      )}
    />
  );
}
