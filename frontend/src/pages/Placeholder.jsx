import { Box, Paper, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

// Pantalla temporal para las secciones que se implementaran en fases siguientes.
export default function Placeholder({ titulo }) {
  return (
    <Paper sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <ConstructionIcon color="primary" />
        <Typography variant="h5">{titulo}</Typography>
      </Box>
      <Typography color="text.secondary">
        Esta seccion esta planificada para una fase posterior. La base de autenticacion,
        navegacion y control por rol ya esta lista para conectarla con la API.
      </Typography>
    </Paper>
  );
}
