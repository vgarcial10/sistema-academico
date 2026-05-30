import { Box, Paper, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatIA from '../components/ChatIA';
import { useAuth } from '../context/AuthContext';

const sugerenciasPorRol = {
  Administrador: ['Promedio de la seccion BD2-A', 'Que estudiantes estan en riesgo?', 'Lista las secciones'],
  Docente: ['Reporte de notas de mi seccion', 'Asistencia de la seccion BD2-A', 'Quien tiene bajo rendimiento?'],
  Estudiante: ['Cual es mi promedio?', 'Tengo alertas?', 'Como va mi asistencia?'],
  Reportes: ['Promedio de la seccion BD2-A', 'Asistencia de la seccion PRG-B'],
};

export default function Asistente() {
  const { usuario } = useAuth();
  const sugerencias = sugerenciasPorRol[usuario?.nombre_rol] || ['Lista las secciones'];

  return (
    <Paper sx={{ p: 3, maxWidth: 820 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <SmartToyIcon color="secondary" />
        <Typography variant="h5">Asistente IA</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pregunta en lenguaje natural sobre notas, asistencia, alertas y reportes. Las respuestas se
        basan en datos reales del sistema.
      </Typography>

      <ChatIA
        idEstudiante={null}
        sugerencias={sugerencias}
        saludo={`Hola ${usuario?.nombre_completo || ''}. Soy tu asistente academico, en que te ayudo?`}
        altura={380}
      />
    </Paper>
  );
}
