import { useEffect, useState, useCallback } from 'react';
import {
  Alert, Box, CircularProgress, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography, InputAdornment,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { getErrorMessage } from '../api/auth';
import { exportarExcel, exportarPDF } from '../utils/exportar';

// Pagina generica de listado: recibe titulo, columnas y una funcion que trae los datos.
// columns: [{ key, label, render?(value, row) }]
export default function DataTablePage({ titulo, columns, fetchFn, rowKey, headerActions = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFn();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los datos'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtered = rows.filter((row) =>
    query.trim() === ''
      ? true
      : columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Paper>
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {titulo}
        </Typography>
        {headerActions}
        <TextField
          size="small"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="Exportar a Excel">
          <span>
            <IconButton color="success" onClick={() => exportarExcel(titulo, columns, filtered)} disabled={filtered.length === 0}>
              <GridOnIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Exportar a PDF">
          <span>
            <IconButton color="error" onClick={() => exportarPDF(titulo, columns, filtered)} disabled={filtered.length === 0}>
              <PictureAsPdfIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Recargar">
          <IconButton onClick={cargar}><RefreshIcon /></IconButton>
        </Tooltip>
      </Toolbar>

      {error && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Sin registros para mostrar.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row[rowKey]} hover>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.render ? c.render(row[c.key], row) : row[c.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
