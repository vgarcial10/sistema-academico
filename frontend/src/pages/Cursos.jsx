import DataTablePage from '../components/DataTablePage';
import { getCursos } from '../api/catalogos';

const columns = [
  { key: 'codigo', label: 'Codigo' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'creditos', label: 'Creditos' },
  { key: 'ciclo_requerido', label: 'Ciclo requerido' },
];

export default function Cursos() {
  return <DataTablePage titulo="Cursos" columns={columns} fetchFn={getCursos} rowKey="id_curso" />;
}
