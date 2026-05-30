import { useEffect, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { consultarIA } from '../api/perfil';
import { getErrorMessage } from '../api/auth';

// Chat reutilizable contra el agente de IA (/api/ai/consulta).
// idEstudiante: si se pasa, acota la consulta a ese estudiante; si es null, el agente decide.
export default function ChatIA({ idEstudiante = null, sugerencias = [], saludo, altura = 320 }) {
  const [mensajes, setMensajes] = useState([
    { from: 'bot', text: saludo || 'Hola, soy tu asistente academico. En que te ayudo?' },
  ]);
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando]);

  const enviar = async (texto) => {
    const q = (texto ?? pregunta).trim();
    if (!q || pensando) return;
    setMensajes((m) => [...m, { from: 'user', text: q }]);
    setPregunta('');
    setPensando(true);
    try {
      const res = await consultarIA(q, idEstudiante);
      setMensajes((m) => [...m, { from: 'bot', text: res.respuesta }]);
    } catch (err) {
      setMensajes((m) => [...m, { from: 'bot', text: getErrorMessage(err, 'No pude responder en este momento.') }]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <Box>
      <Box sx={{ height: altura, overflowY: 'auto', mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
        {mensajes.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', mb: 1 }}>
            <Box
              sx={{
                px: 1.5, py: 1, borderRadius: 2, maxWidth: '80%',
                bgcolor: m.from === 'user' ? 'primary.main' : 'grey.200',
                color: m.from === 'user' ? 'primary.contrastText' : 'text.primary',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Typography variant="body2">{m.text}</Typography>
            </Box>
          </Box>
        ))}
        {pensando && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CircularProgress size={14} /> <Typography variant="caption">Pensando...</Typography>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Box>

      {sugerencias.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          {sugerencias.map((s) => (
            <Chip key={s} label={s} size="small" onClick={() => enviar(s)} clickable disabled={pensando} />
          ))}
        </Stack>
      )}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); enviar(); }} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth size="small" placeholder="Escribe tu pregunta..."
          value={pregunta} onChange={(e) => setPregunta(e.target.value)}
        />
        <IconButton type="submit" color="primary" disabled={pensando || !pregunta.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
