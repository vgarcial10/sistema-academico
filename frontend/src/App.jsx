import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Estudiantes from './pages/Estudiantes';
import Cursos from './pages/Cursos';
import Secciones from './pages/Secciones';
import Notas from './pages/Notas';
import Asistencia from './pages/Asistencia';
import Reportes from './pages/Reportes';
import Perfil from './pages/Perfil';
import Auditoria from './pages/Auditoria';
import RegistroUsuario from './pages/RegistroUsuario';
import Asistente from './pages/Asistente';
import Inscripciones from './pages/Inscripciones';
import NuevoCurso from './pages/NuevoCurso';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route
          path="/estudiantes"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Estudiantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cursos"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Cursos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cursos/nuevo"
          element={
            <ProtectedRoute roles={['Administrador']}>
              <NuevoCurso />
            </ProtectedRoute>
          }
        />
        <Route
          path="/secciones"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Secciones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inscripciones"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Inscripciones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notas"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Notas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asistencia"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente']}>
              <Asistencia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute roles={['Administrador', 'Docente', 'Reportes']}>
              <Reportes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute roles={['Estudiante']}>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios/nuevo"
          element={
            <ProtectedRoute roles={['Administrador']}>
              <RegistroUsuario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditoria"
          element={
            <ProtectedRoute roles={['Administrador']}>
              <Auditoria />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
