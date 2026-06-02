import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ClassIcon from '@mui/icons-material/Class';
import GradeIcon from '@mui/icons-material/Grade';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PostAddIcon from '@mui/icons-material/PostAdd';
import BackupIcon from '@mui/icons-material/Backup';
import SpeedIcon from '@mui/icons-material/Speed';

// Items de navegacion. `roles` vacio = visible para cualquier sesion.
// Estas rutas (salvo Dashboard) son placeholders de la Fase 1.
export const menuItems = [
  { label: 'Dashboard', path: '/', icon: DashboardIcon, roles: [] },
  { label: 'Estudiantes', path: '/estudiantes', icon: PeopleIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Cursos', path: '/cursos', icon: MenuBookIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Nuevo Curso', path: '/cursos/nuevo', icon: PostAddIcon, roles: ['Administrador'] },
  { label: 'Secciones', path: '/secciones', icon: ClassIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Inscripciones', path: '/inscripciones', icon: HowToRegIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Registro de Notas', path: '/notas', icon: GradeIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Asistencia', path: '/asistencia', icon: FactCheckIcon, roles: ['Administrador', 'Docente'] },
  { label: 'Reportes', path: '/reportes', icon: AssessmentIcon, roles: ['Administrador', 'Docente', 'Reportes'] },
  { label: 'Mi Perfil', path: '/perfil', icon: PersonIcon, roles: ['Estudiante'] },
  { label: 'Asistente IA', path: '/asistente', icon: SmartToyIcon, roles: [] },
  { label: 'Registrar Usuario', path: '/usuarios/nuevo', icon: PersonAddIcon, roles: ['Administrador'] },
  { label: 'Backup DB', path: '/backup', icon: BackupIcon, roles: ['Administrador'] },
  { label: 'Monitoreo Consultas', path: '/monitoreo-consultas', icon: SpeedIcon, roles: ['Administrador'] },
  { label: 'Auditoria', path: '/auditoria', icon: HistoryIcon, roles: ['Administrador'] },
];

// Devuelve los items visibles para un rol dado.
export function menuForRole(nombreRol) {
  return menuItems.filter((item) => item.roles.length === 0 || item.roles.includes(nombreRol));
}
