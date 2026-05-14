'use client';

import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minus, ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const SpreadsheetGrid = dynamic(() => import('@/components/spreadsheet/SpreadsheetGrid'), { ssr: false });
const GraphSandbox = dynamic(() => import('@/components/graph/GraphSandbox'), { ssr: false });
const ProConverter = dynamic(() => import('@/components/converter/ProConverter'), { ssr: false });

const WINDOW_CONTENT: Record<string, React.FC> = {
  spreadsheet: SpreadsheetGrid,
  graph: GraphSandbox,
  converter: ProConverter,
};

const TYPE_COLOR: Record<string, string> = {
  spreadsheet: '#00F2FF',
  graph: '#7000FF',
  converter: '#FF6B6B',
};

function WindowFrame({ win }: { win: any }) {
  const { id, title, type, x, y, width, height, isOpen, isMinimized } = win;
  const updateWindow = useStore((s) => s.updateWindow);
  const closeWindow = useStore((s) => s.closeWindow);
  const minimizeWindow = useStore((s) => s.minimizeWindow);
  const setActiveWindow = useStore((s) => s.setActiveWindow);
  const activeWindowId = useStore((s) => s.activeWindowId);

  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ width, height });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);
  const isActive = activeWindowId === id;
  const color = TYPE_COLOR[type] ?? '#00F2FF';
  const ContentComponent = WINDOW_CONTENT[type];

  if (!isOpen) return null;

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setActiveWindow(id);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const nx = dragStart.current.ox + ev.clientX - dragStart.current.mx;
      const ny = dragStart.current.oy + ev.clientY - dragStart.current.my;
      setPos({ x: Math.max(0, nx), y: Math.max(0, ny) });
    };
    const onUp = () => {
      updateWindow(id, { x: pos.x, y: pos.y });
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: size.width, oh: size.height };

    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return;
      const nw = Math.max(360, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(280, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      setSize({ width: nw, height: nh });
    };
    const onUp = () => {
      updateWindow(id, { width: size.width, height: size.height });
      resizeStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      onPointerDown={() => setActiveWindow(id)}
      className={`glass-dark rounded-2xl flex flex-col overflow-hidden transition-shadow duration-200 ${
        isActive
          ? 'shadow-[0_0_40px_rgba(0,0,0,0.6)]'
          : 'shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
      }`}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: isMinimized ? 280 : size.width,
        height: isMinimized ? 44 : size.height,
        zIndex: isActive ? 40 : 30,
        border: isActive ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.08)',
      } as any}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleTitleBarMouseDown}
        className="h-11 flex-shrink-0 flex items-center justify-between px-4 select-none cursor-grab active:cursor-grabbing"
        style={{ background: `${color}08`, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-sm font-medium text-white/80 font-mono-aerox tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => minimizeWindow(id)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => {
              const maxW = window.innerWidth - pos.x - 20;
              const maxH = window.innerHeight - pos.y - 80;
              setSize({ width: maxW, height: maxH });
              updateWindow(id, { width: maxW, height: maxH });
            }}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => closeWindow(id)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/30 text-white/40 hover:text-red-400 transition-all"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && ContentComponent && (
        <div className="flex-1 overflow-hidden p-3">
          <ContentComponent />
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${color}40 50%)`,
            borderRadius: '0 0 16px 0',
          }}
        />
      )}
    </motion.div>
  );
}

export default function Workspace() {
  const windows = useStore((s) => s.windows);

  return (
    <div className="absolute inset-0 z-10">
      <AnimatePresence>
        {windows.filter((w) => w.isOpen).map((win) => (
          <WindowFrame key={win.id} win={win} />
        ))}
      </AnimatePresence>
    </div>
  );
}
