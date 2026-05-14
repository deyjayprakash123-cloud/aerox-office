import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WindowType = 'spreadsheet' | 'graph' | 'converter' | 'compressor' | 'pdfmaker';

export interface WindowItem {
  id: string;
  type: WindowType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  isMinimized: boolean;
}

export type CellValue = string | number | null;

export interface SpreadsheetState {
  data: CellValue[][];
  selectedRange: { row: number; col: number } | null;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

function generateEmptyGrid(rows = 100, cols = 26): CellValue[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

interface AeroxStore {
  // Windows
  windows: WindowItem[];
  activeWindowId: string | null;
  addWindow: (type: WindowType) => void;
  updateWindow: (id: string, updates: Partial<WindowItem>) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  setActiveWindow: (id: string) => void;

  // Spreadsheet
  spreadsheet: SpreadsheetState;
  setCellValue: (row: number, col: number, value: CellValue) => void;
  setSelectedCell: (row: number, col: number) => void;
  pasteRange: (startRow: number, startCol: number, values: CellValue[][]) => void;
}

const WINDOW_DEFAULTS: Record<WindowType, { title: string; width: number; height: number }> = {
  spreadsheet: { title: 'Data Grid',       width: 900, height: 560 },
  graph:       { title: 'Graph Sandbox',   width: 680, height: 500 },
  converter:   { title: 'Pro Converter',   width: 560, height: 620 },
  compressor:  { title: 'File Compressor', width: 560, height: 560 },
  pdfmaker:    { title: 'PDF Maker',       width: 680, height: 680 },
};

export const useStore = create<AeroxStore>()(
  persist(
    (set, get) => ({
      // ── Windows ─────────────────────────────────────────────────────────────
      windows: [],
      activeWindowId: null,

      addWindow: (type) => {
        const id = `${type}-${Date.now()}`;
        const defaults = WINDOW_DEFAULTS[type];
        const offset = get().windows.filter((w) => w.isOpen).length * 32;
        set((state) => ({
          windows: [
            ...state.windows,
            {
              id,
              type,
              title: defaults.title,
              x: 80 + offset,
              y: 80 + offset,
              width: defaults.width,
              height: defaults.height,
              isOpen: true,
              isMinimized: false,
            },
          ],
          activeWindowId: id,
        }));
      },

      updateWindow: (id, updates) =>
        set((state) => ({
          windows: state.windows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),

      closeWindow: (id) =>
        set((state) => ({
          windows: state.windows.map((w) => (w.id === id ? { ...w, isOpen: false } : w)),
          activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
        })),

      minimizeWindow: (id) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
          ),
        })),

      setActiveWindow: (id) => set({ activeWindowId: id }),

      // ── Spreadsheet ──────────────────────────────────────────────────────────
      spreadsheet: {
        data: generateEmptyGrid(),
        selectedRange: null,
      },

      setCellValue: (row, col, value) =>
        set((state) => {
          const newData = state.spreadsheet.data.map((r, ri) =>
            ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r
          );
          return { spreadsheet: { ...state.spreadsheet, data: newData } };
        }),

      setSelectedCell: (row, col) =>
        set((state) => ({
          spreadsheet: { ...state.spreadsheet, selectedRange: { row, col } },
        })),

      pasteRange: (startRow, startCol, values) =>
        set((state) => {
          const newData = state.spreadsheet.data.map((row, ri) => {
            const pasteRowIdx = ri - startRow;
            if (pasteRowIdx < 0 || pasteRowIdx >= values.length) return row;
            return row.map((cell, ci) => {
              const pasteColIdx = ci - startCol;
              if (pasteColIdx < 0 || pasteColIdx >= values[pasteRowIdx].length) return cell;
              return values[pasteRowIdx][pasteColIdx];
            });
          });
          return { spreadsheet: { ...state.spreadsheet, data: newData } };
        }),
    }),
    {
      name: 'aerox-office-storage',
      partialize: (state) => ({
        windows: state.windows,
        spreadsheet: state.spreadsheet,
      }),
    }
  )
);
