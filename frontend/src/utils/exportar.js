import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// columns: [{ key, label, exportValue?(row) }]
// Si una columna define exportValue se usa ese valor; si no, se toma row[key].
function valorCelda(row, col) {
  const v = col.exportValue ? col.exportValue(row) : row[col.key];
  return v === null || v === undefined ? '' : v;
}

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

// Exporta filas a un archivo .xlsx descargable.
export function exportarExcel(nombre, columns, rows) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col.label, valorCelda(row, col)]))
  );
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `${nombre}_${timestamp()}.xlsx`);
}

// Exporta filas a un archivo .pdf con tabla (encabezado por pagina).
export function exportarPDF(titulo, columns, rows) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize?.(14);
  doc.text(titulo, 14, 15);
  doc.setFontSize?.(9);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((col) => String(valorCelda(row, col)))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [21, 101, 192] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${titulo}_${timestamp()}.pdf`);
}
