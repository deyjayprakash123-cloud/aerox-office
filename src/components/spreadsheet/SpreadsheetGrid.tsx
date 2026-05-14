'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useStore, CellValue } from '@/store/useStore';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Scissors,
  ClipboardPaste,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Sparkles,
  X,
  CheckCheck,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_ROWS = 100;
const TOTAL_COLS = 26;
const ROW_H = 28;
const COL_W = 110;
const ROW_HDR_W = 48;
const COL_HDR_H = 28;
const VISIBLE_ROWS_BUFFER = 5;

const COL_LETTERS = Array.from({ length: TOTAL_COLS }, (_, i) =>
  String.fromCharCode(65 + i)
);

// ── Formula Evaluation ───────────────────────────────────────────────────────
function evalFormula(formula: string, data: CellValue[][]): string {
  try {
    const expr = formula.slice(1).toUpperCase();

    // SUM(A1:B3)
    const sumMatch = expr.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (sumMatch) {
      const c1 = sumMatch[1].charCodeAt(0) - 65;
      const r1 = parseInt(sumMatch[2]) - 1;
      const c2 = sumMatch[3].charCodeAt(0) - 65;
      const r2 = parseInt(sumMatch[4]) - 1;
      let sum = 0;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          sum += parseFloat(String(data[r]?.[c] ?? 0)) || 0;
      return String(sum);
    }

    // AVERAGE
    const avgMatch = expr.match(/^AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (avgMatch) {
      const c1 = avgMatch[1].charCodeAt(0) - 65;
      const r1 = parseInt(avgMatch[2]) - 1;
      const c2 = avgMatch[3].charCodeAt(0) - 65;
      const r2 = parseInt(avgMatch[4]) - 1;
      let sum = 0, count = 0;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) {
          const v = parseFloat(String(data[r]?.[c] ?? ''));
          if (!isNaN(v)) { sum += v; count++; }
        }
      return count ? String(sum / count) : '0';
    }

    // MAX
    const maxMatch = expr.match(/^MAX\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (maxMatch) {
      const c1 = maxMatch[1].charCodeAt(0) - 65;
      const r1 = parseInt(maxMatch[2]) - 1;
      const c2 = maxMatch[3].charCodeAt(0) - 65;
      const r2 = parseInt(maxMatch[4]) - 1;
      let max = -Infinity;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) {
          const v = parseFloat(String(data[r]?.[c] ?? ''));
          if (!isNaN(v) && v > max) max = v;
        }
      return max === -Infinity ? '0' : String(max);
    }

    // MIN
    const minMatch = expr.match(/^MIN\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (minMatch) {
      const c1 = minMatch[1].charCodeAt(0) - 65;
      const r1 = parseInt(minMatch[2]) - 1;
      const c2 = minMatch[3].charCodeAt(0) - 65;
      const r2 = parseInt(minMatch[4]) - 1;
      let min = Infinity;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) {
          const v = parseFloat(String(data[r]?.[c] ?? ''));
          if (!isNaN(v) && v < min) min = v;
        }
      return min === Infinity ? '0' : String(min);
    }

    // COUNT
    const countMatch = expr.match(/^COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (countMatch) {
      const c1 = countMatch[1].charCodeAt(0) - 65;
      const r1 = parseInt(countMatch[2]) - 1;
      const c2 = countMatch[3].charCodeAt(0) - 65;
      const r2 = parseInt(countMatch[4]) - 1;
      let count = 0;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          if (data[r]?.[c] !== '' && data[r]?.[c] !== null) count++;
      return String(count);
    }

    // Cell reference e.g. =A1
    const refMatch = expr.match(/^([A-Z]+)(\d+)$/);
    if (refMatch) {
      const c = refMatch[1].charCodeAt(0) - 65;
      const r = parseInt(refMatch[2]) - 1;
      return String(data[r]?.[c] ?? '');
    }

    return '#ERR';
  } catch {
    return '#ERR';
  }
}

function getDisplayValue(raw: CellValue, data: CellValue[][]): string {
  const s = String(raw ?? '');
  if (s.startsWith('=')) return evalFormula(s, data);
  return s;
}

// ── Clipboard Parser ─────────────────────────────────────────────────────────
function parseClipboardToGrid(text: string, html?: string): CellValue[][] | null {
  // 1. Try HTML table first
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      const grid = rows.map((tr) =>
        Array.from(tr.querySelectorAll('td,th')).map((td) =>
          td.textContent?.trim() ?? ''
        )
      ).filter((r) => r.length > 0);
      if (grid.length > 0) return grid;
    }
  }
  // 2. Try TSV (tab-separated — common from Excel / Google Sheets)
  if (text.includes('\t')) {
    const rows = text.split('\n').map((r) => r.split('\t').map((c) => c.trim()));
    const filtered = rows.filter((r) => r.some((c) => c !== ''));
    if (filtered.length > 0) return filtered;
  }
  // 3. Try CSV
  if (text.includes(',')) {
    const rows = text.split('\n').map((r) =>
      r.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
    );
    const filtered = rows.filter((r) => r.some((c) => c !== ''));
    if (filtered.length > 1) return filtered; // require >1 row to avoid false positives
  }
  return null;
}

// ── Paste Preview Modal ───────────────────────────────────────────────────────
function PastePreviewModal({
  grid,
  targetCell,
  onConfirm,
  onCancel,
}: {
  grid: CellValue[][];
  targetCell: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const maxPreviewRows = Math.min(grid.length, 8);
  const maxPreviewCols = Math.min(grid[0]?.length ?? 0, 10);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-dark rounded-2xl border border-white/15 shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" style={{ boxShadow: '0 0 60px rgba(0,242,255,0.15)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00F2FF]/15 border border-[#00F2FF]/30 flex items-center justify-center">
              <Sparkles size={15} className="text-[#00F2FF]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Smart Paste Preview</div>
              <div className="text-xs text-white/40 mt-0.5">
                {grid.length} rows × {grid[0]?.length ?? 0} cols · Starting at <span className="text-[#00F2FF] font-mono">{targetCell}</span>
              </div>
            </div>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Preview Table */}
        <div className="p-4 overflow-auto max-h-64">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {grid.slice(0, maxPreviewRows).map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-[#00F2FF]/8' : 'hover:bg-white/3'}>
                  {row.slice(0, maxPreviewCols).map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-1.5 border border-white/8 text-white/70 truncate max-w-[140px]"
                      title={String(cell)}
                    >
                      {String(cell)}
                    </td>
                  ))}
                  {row.length > maxPreviewCols && (
                    <td className="px-2 py-1.5 text-white/30 italic">+{row.length - maxPreviewCols} more…</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {grid.length > maxPreviewRows && (
            <div className="text-center text-xs text-white/30 italic mt-2">…and {grid.length - maxPreviewRows} more rows</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-black bg-[#00F2FF] hover:bg-[#00F2FF]/90 transition-all flex items-center gap-2"
            style={{ boxShadow: '0 0 18px rgba(0,242,255,0.35)' }}
          >
            <CheckCheck size={13} />
            Paste {grid.length}×{grid[0]?.length ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({
  onDownload,
  onDownloadPdf,
  onCopy,
  onCut,
  onPaste,
  onSmartPaste,
}: {
  onDownload: (fmt: 'xlsx' | 'csv') => void;
  onDownloadPdf: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSmartPaste: () => void;
}) {
  const [showDlMenu, setShowDlMenu] = useState(false);

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border-b border-white/10 flex-shrink-0 flex-wrap">
      {/* Clipboard group */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-1">
        <ToolBtn icon={Copy} label="Copy" onClick={onCopy} />
        <ToolBtn icon={Scissors} label="Cut" onClick={onCut} />
        <ToolBtn icon={ClipboardPaste} label="Paste (single cell)" onClick={onPaste} />
      </div>

      {/* Smart Paste */}
      <button
        title="Smart Paste from web table / Excel / CSV"
        onClick={onSmartPaste}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10 transition-all mr-1"
      >
        <Sparkles size={12} />
        Smart Paste
      </button>

      {/* Format group (cosmetic) */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-1">
        <ToolBtn icon={Bold} label="Bold" onClick={() => {}} />
        <ToolBtn icon={AlignLeft} label="Align Left" onClick={() => {}} />
        <ToolBtn icon={AlignCenter} label="Align Center" onClick={() => {}} />
        <ToolBtn icon={AlignRight} label="Align Right" onClick={() => {}} />
      </div>

      {/* Download */}
      <div className="relative">
        <button
          onClick={() => setShowDlMenu((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#00F2FF] border border-[#00F2FF]/30 hover:bg-[#00F2FF]/10 transition-all"
        >
          <Download size={13} />
          Export
          <ChevronDown size={11} />
        </button>
        {showDlMenu && (
          <div className="absolute top-full left-0 mt-1 glass-dark rounded-xl border border-white/10 z-50 overflow-hidden min-w-[180px]">
            <button
              onClick={() => { onDownload('xlsx'); setShowDlMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              Download .xlsx
            </button>
            <button
              onClick={() => { onDownload('csv'); setShowDlMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <FileText size={14} className="text-[#00F2FF]" />
              Download .csv
            </button>
            <div className="h-px bg-white/10 mx-3" />
            <button
              onClick={() => { onDownloadPdf(); setShowDlMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <FileDown size={14} className="text-[#FF6B6B]" />
              Export as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
    >
      <Icon size={13} />
    </button>
  );
}

// ── Main Spreadsheet ─────────────────────────────────────────────────────────
export default function SpreadsheetGrid() {
  const spreadsheetData = useStore((s) => s.spreadsheet.data);
  const selectedRange = useStore((s) => s.spreadsheet.selectedRange);
  const setCellValue = useStore((s) => s.setCellValue);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const pasteRange = useStore((s) => s.pasteRange);

  const [pastePreview, setPastePreview] = useState<{ grid: CellValue[][]; startRow: number; startCol: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerH, setContainerH] = useState(400);
  const [containerW, setContainerW] = useState(800);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const clipboard = useRef<string>('');

  // Observe container size
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setContainerH(el.clientHeight);
      setContainerW(el.clientWidth);
    });
    obs.observe(el);
    setContainerH(el.clientHeight);
    setContainerW(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  // Scroll handler
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Visible row/col range
  const firstVisRow = Math.max(0, Math.floor(scrollTop / ROW_H) - VISIBLE_ROWS_BUFFER);
  const visRowCount = Math.ceil(containerH / ROW_H) + VISIBLE_ROWS_BUFFER * 2;
  const lastVisRow = Math.min(TOTAL_ROWS - 1, firstVisRow + visRowCount);

  const firstVisCol = Math.max(0, Math.floor(scrollLeft / COL_W) - 2);
  const visColCount = Math.ceil(containerW / COL_W) + 4;
  const lastVisCol = Math.min(TOTAL_COLS - 1, firstVisCol + visColCount);

  // Update formula bar when selection changes
  useEffect(() => {
    if (selectedRange) {
      const raw = spreadsheetData[selectedRange.row]?.[selectedRange.col] ?? '';
      setFormulaBarValue(String(raw));
    }
  }, [selectedRange, spreadsheetData]);

  const startEdit = useCallback(
    (r: number, c: number) => {
      const raw = spreadsheetData[r]?.[c] ?? '';
      setDraft(String(raw));
      setEditingCell({ r, c });
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [spreadsheetData]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    setCellValue(editingCell.r, editingCell.c, draft);
    setEditingCell(null);
  }, [editingCell, draft, setCellValue]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(
    (fmt: 'xlsx' | 'csv') => {
      const aoa: string[][] = spreadsheetData.map((row) =>
        row.map((cell) => getDisplayValue(cell, spreadsheetData))
      );
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      if (fmt === 'xlsx') {
        XLSX.writeFile(wb, 'aerox-office-data.xlsx');
      } else {
        XLSX.writeFile(wb, 'aerox-office-data.csv', { bookType: 'csv' });
      }
    },
    [spreadsheetData]
  );

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    // Trim to rows/cols that actually have data
    const rows: string[][] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      const row = spreadsheetData[r];
      const hasData = row.some((c) => c !== '' && c !== null);
      if (hasData) {
        rows.push(row.map((c) => getDisplayValue(c, spreadsheetData)));
      }
    }
    if (rows.length === 0) return;

    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Layout constants
    const PAGE_W = 842, PAGE_H = 595;          // A4 landscape
    const MARGIN = 36;
    const HEADER_H = 40;
    const ROW_H_PDF = 18;
    const FOOTER_H = 28;
    const usableW = PAGE_W - MARGIN * 2;
    const usableH = PAGE_H - MARGIN - HEADER_H - FOOTER_H;
    const rowsPerPage = Math.floor(usableH / ROW_H_PDF);

    // Determine column widths — equal split capped at data
    const numCols = Math.max(...rows.map((r) => r.length));
    const colW = Math.floor(usableW / numCols);

    // Colors
    const cAqua  = rgb(0, 0.949, 1);         // #00F2FF
    const cDark  = rgb(0.02, 0.02, 0.04);    // near-black bg
    const cRow1  = rgb(0.07, 0.07, 0.1);     // zebra dark
    const cRow2  = rgb(0.05, 0.05, 0.08);    // zebra light
    const cBorder = rgb(0.15, 0.15, 0.2);
    const cText  = rgb(0.85, 0.85, 0.9);
    const cHead  = rgb(0.9, 0.95, 1);
    const cFml   = rgb(0.3, 0.95, 0.5);      // formula green
    const cNum   = rgb(0.4, 0.8, 1);         // number blue

    const isNumeric = (s: string) => s !== '' && !isNaN(Number(s));

    const drawPage = (pageRows: string[][], pageNum: number, totalPages: number) => {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

      // Background
      page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cDark });

      // Header bar
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: rgb(0, 0.1, 0.15) });
      // Accent stripe
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: 4, height: HEADER_H, color: cAqua });

      page.drawText('AEROX OFFICE', {
        x: MARGIN, y: PAGE_H - 26, size: 11, font: fontBold, color: cAqua,
      });
      page.drawText('Data Grid Export', {
        x: MARGIN + 115, y: PAGE_H - 26, size: 9, font: fontReg, color: rgb(0.6, 0.7, 0.8),
      });
      page.drawText(`Page ${pageNum} of ${totalPages}  ·  ${new Date().toLocaleDateString()}`, {
        x: PAGE_W - MARGIN - 160, y: PAGE_H - 26, size: 8, font: fontReg, color: rgb(0.4, 0.5, 0.6),
      });

      // Table rows
      pageRows.forEach((row, ri) => {
        const y = PAGE_H - HEADER_H - MARGIN * 0.5 - (ri + 1) * ROW_H_PDF;
        const isHeader = pageNum === 1 && ri === 0;
        const rowColor = isHeader ? rgb(0, 0.12, 0.18) : ri % 2 === 0 ? cRow1 : cRow2;

        // Row background
        page.drawRectangle({ x: MARGIN, y: y - 2, width: usableW, height: ROW_H_PDF, color: rowColor });

        // Header underline
        if (isHeader) {
          page.drawRectangle({ x: MARGIN, y: y - 2, width: usableW, height: 1, color: cAqua });
        }

        // Cells
        row.slice(0, numCols).forEach((cell, ci) => {
          const x = MARGIN + ci * colW;
          const maxChars = Math.floor((colW - 6) / 5.5);
          const text = String(cell).length > maxChars
            ? String(cell).slice(0, maxChars - 1) + '…'
            : String(cell);

          const cellColor = isHeader ? cHead
            : cell.startsWith('=') ? cFml
            : isNumeric(cell) ? cNum
            : cText;

          page.drawText(text, {
            x: x + 4,
            y: y + 4,
            size: isHeader ? 7.5 : 7,
            font: isHeader ? fontBold : isNumeric(cell) ? fontMono : fontReg,
            color: cellColor,
            maxWidth: colW - 8,
          });

          // Column divider
          if (ci < numCols - 1) {
            page.drawLine({
              start: { x: x + colW, y: y - 2 },
              end:   { x: x + colW, y: y + ROW_H_PDF - 2 },
              thickness: 0.3,
              color: cBorder,
            });
          }
        });

        // Row divider
        page.drawLine({
          start: { x: MARGIN, y: y - 2 },
          end:   { x: MARGIN + usableW, y: y - 2 },
          thickness: 0.3,
          color: cBorder,
        });
      });

      // Outer border
      const tableH = pageRows.length * ROW_H_PDF;
      const tableY = PAGE_H - HEADER_H - MARGIN * 0.5 - tableH;
      page.drawRectangle({
        x: MARGIN, y: tableY - 2, width: usableW, height: tableH,
        borderColor: cAqua, borderWidth: 0.6,
        color: rgb(0, 0, 0),
        opacity: 0,
      });

      // Footer
      page.drawLine({
        start: { x: MARGIN, y: FOOTER_H }, end: { x: PAGE_W - MARGIN, y: FOOTER_H },
        thickness: 0.3, color: cBorder,
      });
      page.drawText('Generated by AEROX OFFICE · Client-Side Only · aerox-office', {
        x: MARGIN, y: 10, size: 7, font: fontReg, color: rgb(0.25, 0.3, 0.4),
      });
    };

    // Paginate rows (keep row 0 as header on every page)
    const headerRow = rows[0];
    const dataRows  = rows.slice(1);
    const dataPerPage = rowsPerPage - 1; // reserve one row for the header
    const totalPages = Math.max(1, Math.ceil(dataRows.length / dataPerPage));

    for (let p = 0; p < totalPages; p++) {
      const chunk = dataRows.slice(p * dataPerPage, (p + 1) * dataPerPage);
      drawPage([headerRow, ...chunk], p + 1, totalPages);
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerox-office-data-${Date.now()}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [spreadsheetData]);

  // ── Clipboard ───────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!selectedRange) return;
    const val = spreadsheetData[selectedRange.row]?.[selectedRange.col] ?? '';
    clipboard.current = String(val);
    navigator.clipboard?.writeText(clipboard.current).catch(() => {});
  }, [selectedRange, spreadsheetData]);

  const handleCut = useCallback(() => {
    if (!selectedRange) return;
    handleCopy();
    setCellValue(selectedRange.row, selectedRange.col, '');
  }, [selectedRange, handleCopy, setCellValue]);

  const handlePaste = useCallback(() => {
    if (!selectedRange) return;
    const val = clipboard.current;
    if (val !== '') setCellValue(selectedRange.row, selectedRange.col, val);
  }, [selectedRange, setCellValue]);

  // Smart paste: reads system clipboard, parses tables/TSV/CSV
  const handleSmartPaste = useCallback(async () => {
    const target = selectedRange ?? { row: 0, col: 0 };
    try {
      const items = await navigator.clipboard.read();
      let htmlText: string | undefined;
      let plainText = '';
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          htmlText = await blob.text();
        }
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          plainText = await blob.text();
        }
      }
      const grid = parseClipboardToGrid(plainText, htmlText);
      if (grid && grid.length > 0) {
        setPastePreview({ grid, startRow: target.row, startCol: target.col });
      } else if (plainText) {
        // fallback: single-cell paste
        setCellValue(target.row, target.col, plainText.trim());
      }
    } catch {
      // Fallback if clipboard.read() is not permitted
      try {
        const text = await navigator.clipboard.readText();
        const grid = parseClipboardToGrid(text);
        if (grid && grid.length > 0) {
          setPastePreview({ grid, startRow: target.row, startCol: target.col });
        } else if (text) {
          setCellValue(target.row, target.col, text.trim());
        }
      } catch {
        // clipboard unavailable — do nothing
      }
    }
  }, [selectedRange, setCellValue]);

  const confirmSmartPaste = useCallback(() => {
    if (!pastePreview) return;
    pasteRange(pastePreview.startRow, pastePreview.startCol, pastePreview.grid);
    setPastePreview(null);
  }, [pastePreview, pasteRange]);

  const cancelSmartPaste = useCallback(() => setPastePreview(null), []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) return;
      if (!selectedRange) return;
      const { row, col } = selectedRange;

      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCell(Math.min(row + 1, TOTAL_ROWS - 1), col); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCell(Math.max(row - 1, 0), col); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCell(row, Math.min(col + 1, TOTAL_COLS - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedCell(row, Math.max(col - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); startEdit(row, col); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { setCellValue(row, col, ''); }
      else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
        setDraft(e.key);
        setEditingCell({ r: row, c: col });
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.ctrlKey && e.key === 'c') handleCopy();
      if (e.ctrlKey && e.key === 'x') handleCut();
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); handleSmartPaste(); }
    },
    [editingCell, selectedRange, startEdit, setCellValue, setSelectedCell, handleCopy, handleCut, handlePaste, handleSmartPaste]
  );

  // Cell address label
  const cellLabel = selectedRange
    ? `${COL_LETTERS[selectedRange.col]}${selectedRange.row + 1}`
    : 'A1';

  return (
    <div
      className="flex flex-col w-full h-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Smart Paste Modal */}
      {pastePreview && (
        <PastePreviewModal
          grid={pastePreview.grid}
          targetCell={`${COL_LETTERS[pastePreview.startCol]}${pastePreview.startRow + 1}`}
          onConfirm={confirmSmartPaste}
          onCancel={cancelSmartPaste}
        />
      )}

      {/* Toolbar */}
      <Toolbar
        onDownload={handleDownload}
        onDownloadPdf={handleDownloadPdf}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onSmartPaste={handleSmartPaste}
      />

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/3 border-b border-white/10 flex-shrink-0">
        <div className="px-3 py-1 glass rounded text-xs font-mono-aerox text-[#00F2FF] min-w-[58px] text-center select-none">
          {cellLabel}
        </div>
        <div className="text-white/30 text-xs font-mono-aerox select-none">fx</div>
        <input
          className="flex-1 bg-transparent text-xs font-mono-aerox text-white/80 outline-none placeholder-white/20"
          value={formulaBarValue}
          placeholder="Enter value or formula, e.g. =SUM(A1:A10)"
          onChange={(e) => {
            setFormulaBarValue(e.target.value);
            if (selectedRange) setCellValue(selectedRange.row, selectedRange.col, e.target.value);
          }}
        />
      </div>

      {/* Grid Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Column Header Row */}
        <div
          className="flex-shrink-0 bg-[#0a0a0a] border-b border-white/10 flex"
          style={{ paddingLeft: ROW_HDR_W, overflow: 'hidden' }}
        >
          <div
            style={{
              display: 'flex',
              transform: `translateX(-${scrollLeft}px)`,
              willChange: 'transform',
            }}
          >
            {COL_LETTERS.map((letter, ci) => (
              <div
                key={letter}
                style={{ width: COL_W, height: COL_HDR_H, flexShrink: 0 }}
                className={`text-center text-xs font-mono-aerox border-r border-white/10 flex items-center justify-center select-none
                  ${selectedRange?.col === ci ? 'text-[#00F2FF] bg-[#00F2FF]/10' : 'text-white/40'}`}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Row Header */}
          <div
            className="bg-[#0a0a0a] border-r border-white/10 flex-shrink-0 overflow-hidden"
            style={{ width: ROW_HDR_W }}
          >
            <div
              style={{ transform: `translateY(-${scrollTop}px)`, willChange: 'transform' }}
            >
              {Array.from({ length: TOTAL_ROWS }, (_, ri) => (
                <div
                  key={ri}
                  style={{ height: ROW_H }}
                  className={`text-right pr-3 text-xs font-mono-aerox flex items-center justify-end border-b border-white/5 select-none
                    ${selectedRange?.row === ri ? 'text-[#00F2FF] bg-[#00F2FF]/10' : 'text-white/30'}`}
                >
                  {ri + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable cell area */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{ overflow: 'auto', flex: 1, position: 'relative' }}
          >
            {/* Total canvas size */}
            <div
              style={{
                width: TOTAL_COLS * COL_W,
                height: TOTAL_ROWS * ROW_H,
                position: 'relative',
              }}
            >
              {/* Render only visible rows */}
              {Array.from({ length: lastVisRow - firstVisRow + 1 }, (_, i) => {
                const ri = firstVisRow + i;
                return (
                  <div
                    key={ri}
                    style={{
                      position: 'absolute',
                      top: ri * ROW_H,
                      left: 0,
                      width: TOTAL_COLS * COL_W,
                      height: ROW_H,
                      display: 'flex',
                    }}
                  >
                    {Array.from({ length: lastVisCol - firstVisCol + 1 }, (_, j) => {
                      const ci = firstVisCol + j;
                      const raw = spreadsheetData[ri]?.[ci] ?? '';
                      const display = getDisplayValue(raw, spreadsheetData);
                      const isSelected = selectedRange?.row === ri && selectedRange?.col === ci;
                      const isEditing = editingCell?.r === ri && editingCell?.c === ci;

                      return (
                        <div
                          key={ci}
                          style={{
                            position: 'absolute',
                            left: ci * COL_W,
                            width: COL_W,
                            height: ROW_H,
                            outline: isSelected ? '2px solid rgba(0,242,255,0.6)' : 'none',
                            outlineOffset: '-1px',
                          }}
                          onClick={() => {
                            if (editingCell) commitEdit();
                            setSelectedCell(ri, ci);
                          }}
                          onDoubleClick={() => startEdit(ri, ci)}
                          className={`border-r border-b border-white/[0.06] flex items-center overflow-hidden cursor-cell
                            ${isSelected && !isEditing ? 'bg-[#00F2FF]/10 border-[#00F2FF]/50 z-10' : ''}
                            ${!isSelected ? 'hover:bg-white/5' : ''}`}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                if (e.key === 'Escape') cancelEdit();
                                if (e.key === 'Tab') { e.preventDefault(); commitEdit(); setSelectedCell(ri, Math.min(ci + 1, TOTAL_COLS - 1)); }
                              }}
                              className="absolute inset-0 w-full h-full bg-[#000d1a] text-[#00F2FF] px-2 text-xs font-mono-aerox outline-none z-20"
                              style={{ boxShadow: '0 0 0 2px #00F2FF inset' }}
                            />
                          ) : (
                            <span
                              className={`px-2 text-xs font-mono-aerox truncate w-full ${
                                String(raw).startsWith('=')
                                  ? display.startsWith('#')
                                    ? 'text-red-400'
                                    : 'text-emerald-400'
                                  : 'text-white/80'
                              }`}
                            >
                              {display}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-white/3 border-t border-white/10 flex-shrink-0 text-xs font-mono-aerox text-white/30">
        <span>
          {selectedRange
            ? `${TOTAL_ROWS} rows × ${TOTAL_COLS} cols · Selected: ${cellLabel}`
            : `${TOTAL_ROWS} rows × ${TOTAL_COLS} cols`}
        </span>
        <span>
          {selectedRange &&
            (() => {
              const val = spreadsheetData[selectedRange.row]?.[selectedRange.col];
              const num = parseFloat(getDisplayValue(val, spreadsheetData));
              return isNaN(num) ? '' : `Value: ${num}`;
            })()}
        </span>
      </div>
    </div>
  );
}
