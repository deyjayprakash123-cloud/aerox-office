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

export interface Sheet {
  id: string;
  name: string;
  data: CellValue[][];
}

export interface SpreadsheetState {
  sheets: Sheet[];
  activeSheetId: string;
  selectedRange: { row: number; col: number } | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateEmptyGrid(rows = 100, cols = 26): CellValue[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

function makeSheet(name: string): Sheet {
  return { id: `sheet-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, data: generateEmptyGrid() };
}

// ─── Store ─────────────────────────────────────────────────────────────────────

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
  /** Convenience getter — data for the active sheet */
  activeSheetData: () => CellValue[][];
  setCellValue: (row: number, col: number, value: CellValue) => void;
  setSelectedCell: (row: number, col: number) => void;
  pasteRange: (startRow: number, startCol: number, values: CellValue[][]) => void;

  // Sheet management
  addSheet: () => void;
  clearSheet: (sheetId: string) => void;
  switchSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  deleteSheet: (sheetId: string) => void;
}

const WINDOW_DEFAULTS: Record<WindowType, { title: string; width: number; height: number }> = {
  spreadsheet: { title: 'Data Grid',       width: 900, height: 560 },
  graph:       { title: 'Graph Sandbox',   width: 680, height: 500 },
  converter:   { title: 'Pro Converter',   width: 560, height: 620 },
  compressor:  { title: 'File Compressor', width: 560, height: 560 },
  pdfmaker:    { title: 'PDF Maker',       width: 680, height: 680 },
};

const defaultSheet = makeSheet('Sheet 1');

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
        sheets: [defaultSheet],
        activeSheetId: defaultSheet.id,
        selectedRange: null,
      },

      activeSheetData: () => {
        const { sheets, activeSheetId } = get().spreadsheet;
        return sheets.find((s) => s.id === activeSheetId)?.data ?? generateEmptyGrid();
      },

      setCellValue: (row, col, value) =>
        set((state) => {
          const { sheets, activeSheetId } = state.spreadsheet;
          const newSheets = sheets.map((sheet) => {
            if (sheet.id !== activeSheetId) return sheet;
            const newData = sheet.data.map((r, ri) =>
              ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r
            );
            return { ...sheet, data: newData };
          });
          return { spreadsheet: { ...state.spreadsheet, sheets: newSheets } };
        }),

      setSelectedCell: (row, col) =>
        set((state) => ({
          spreadsheet: { ...state.spreadsheet, selectedRange: { row, col } },
        })),

      pasteRange: (startRow, startCol, values) =>
        set((state) => {
          const { sheets, activeSheetId } = state.spreadsheet;
          const newSheets = sheets.map((sheet) => {
            if (sheet.id !== activeSheetId) return sheet;
            const newData = sheet.data.map((row, ri) => {
              const pasteRowIdx = ri - startRow;
              if (pasteRowIdx < 0 || pasteRowIdx >= values.length) return row;
              return row.map((cell, ci) => {
                const pasteColIdx = ci - startCol;
                if (pasteColIdx < 0 || pasteColIdx >= values[pasteRowIdx].length) return cell;
                return values[pasteRowIdx][pasteColIdx];
              });
            });
            return { ...sheet, data: newData };
          });
          return { spreadsheet: { ...state.spreadsheet, sheets: newSheets } };
        }),

      // ── Sheet management ──────────────────────────────────────────────────────
      addSheet: () =>
        set((state) => {
          const n = state.spreadsheet.sheets.length + 1;
          const newSheet = makeSheet(`Sheet ${n}`);
          return {
            spreadsheet: {
              ...state.spreadsheet,
              sheets: [...state.spreadsheet.sheets, newSheet],
              activeSheetId: newSheet.id,
            },
          };
        }),

      clearSheet: (sheetId) =>
        set((state) => ({
          spreadsheet: {
            ...state.spreadsheet,
            sheets: state.spreadsheet.sheets.map((s) =>
              s.id === sheetId ? { ...s, data: generateEmptyGrid() } : s
            ),
          },
        })),

      switchSheet: (sheetId) =>
        set((state) => ({
          spreadsheet: {
            ...state.spreadsheet,
            activeSheetId: sheetId,
            selectedRange: null,
          },
        })),

      renameSheet: (sheetId, name) =>
        set((state) => ({
          spreadsheet: {
            ...state.spreadsheet,
            sheets: state.spreadsheet.sheets.map((s) =>
              s.id === sheetId ? { ...s, name } : s
            ),
          },
        })),

      deleteSheet: (sheetId) =>
        set((state) => {
          const { sheets, activeSheetId } = state.spreadsheet;
          if (sheets.length <= 1) return state; // keep at least one
          const newSheets = sheets.filter((s) => s.id !== sheetId);
          const newActiveId =
            activeSheetId === sheetId
              ? newSheets[Math.max(0, sheets.findIndex((s) => s.id === sheetId) - 1)].id
              : activeSheetId;
          return {
            spreadsheet: {
              ...state.spreadsheet,
              sheets: newSheets,
              activeSheetId: newActiveId,
            },
          };
        }),
    }),
    {
      name: 'aerox-office-storage',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          // Old shape had spreadsheet.data (flat array) — upgrade to sheets model
          const oldData = persisted?.spreadsheet?.data;
          if (oldData && Array.isArray(oldData)) {
            const migratedSheet: Sheet = {
              id: `sheet-${Date.now()}`,
              name: 'Sheet 1',
              data: oldData,
            };
            persisted.spreadsheet = {
              sheets: [migratedSheet],
              activeSheetId: migratedSheet.id,
              selectedRange: null,
            };
          }
        }
        return persisted;
      },
      partialize: (state) => ({
        windows: state.windows,
        spreadsheet: state.spreadsheet,
      }),
    }
  )
);
