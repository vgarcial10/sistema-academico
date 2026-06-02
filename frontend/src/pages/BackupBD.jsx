import { useCallback, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, TextField, Toolbar, Typography,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import DataTablePage from '../components/DataTablePage';
import { ejecutarBackup, getMonitoreoBackups } from '../api/backup';
import { getErrorMessage } from '../api/auth';

const fmtFecha = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const colorEstado = (estado) => {
  const e = String(estado || '').toUpperCase();
  if (e === 'EXITOSO') return 'success';
  if (e === 'ERROR') return 'error';
  return 'default';
};

const columns = [
  { key: 'id_monitoreo', label: '#' },
  { key: 'proceso', label: 'Proceso' },
  { key: 'estado', label: 'Estado', render: (v) => <Chip size="small" label={v} color={colorEstado(v)} /> },
  { key: 'usuario', label: 'Usuario', render: (v) => v || 'Sistema' },
  { key: 'fecha_inicio', label: 'Inicio', render: (v) => fmtFecha(v) },
  { key: 'fecha_fin', label: 'Fin', render: (v) => fmtFecha(v) },
  { key: 'duracion_ms', label: 'Duración (ms)', render: (v) => v ?? '-' },
  { key: 'ruta_backup', label: 'Ruta backup' },
  { key: 'detalle', label: 'Detalle' },
];

export default function BackupBD() {
  const [rutaBackup, setRutaBackup] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const fetchMonitoreo = useCallback(async () => {
    void reloadTick;
    return getMonitoreoBackups();
  }, [reloadTick]);

  const ejecutar = async () => {
    setFeedback(null);
    setEnviando(true);
    try {
      const res = await ejecutarBackup(rutaBackup.trim() || null);
      if (res?.exito === 0) {
        setFeedback({ tipo: 'error', texto: res?.mensaje || 'No se pudo generar el backup.' });
      } else {
        setFeedback({
          tipo: 'success',
          texto: `${res?.mensaje || 'Backup generado.'} Ruta: ${res?.ruta_backup || '-'}`,
        });
        setReloadTick((v) => v + 1);
      }
    } catch (err) {
      setFeedback({ tipo: 'error', texto: getErrorMessage(err, 'No se pudo generar el backup.') });
      setReloadTick((v) => v + 1);
    } finally {
      setEnviando(false);
    }
  };

  const accionesHeader = (
    <Toolbar sx={{ p: 0, minHeight: 'auto !important', gap: 1 }}>
      <TextField
        size="small"
        label="Ruta de backup (opcional)"
        placeholder="/var/opt/mssql/backups/dbUniPochinqui_xxx.bak"
        value={rutaBackup}
        onChange={(e) => setRutaBackup(e.target.value)}
        sx={{ minWidth: 320 }}
        disabled={enviando}
      />
      <Button
        variant="contained"
        onClick={ejecutar}
        disabled={enviando}
        startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <BackupIcon />}
      >
        {enviando ? 'Generando...' : 'Generar backup'}
      </Button>
    </Toolbar>
  );

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Backup de Base de Datos</Typography>
        <Typography variant="body2" color="text.secondary">
          Esta operación ejecuta el procedimiento almacenado de backup y registra tiempos en la tabla de monitoreo.
        </Typography>
        {feedback && (
          <Alert severity={feedback.tipo} sx={{ mt: 2 }} onClose={() => setFeedback(null)}>
            {feedback.texto}
          </Alert>
        )}
      </Paper>

      <DataTablePage
        titulo="Monitoreo de backups"
        columns={columns}
        fetchFn={fetchMonitoreo}
        rowKey="id_monitoreo"
        headerActions={accionesHeader}
      />
    </Box>
  );
}
