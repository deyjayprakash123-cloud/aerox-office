'use client';

import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { X, Maximize2, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';

// Draggable window container
function WindowContainer({ windowData, children }: { windowData: any, children: React.ReactNode }) {
  const { id, title, x, y, width, height, isOpen, type } = windowData;
  const updateWindow = useStore((state) => state.updateWindow);
  const closeWindow = useStore((state) => state.closeWindow);
  const setActiveWindow = useStore((state) => state.setActiveWindow);
  const activeWindow = useStore((state) => state.activeWindowId);

  const [position, setPosition] = useState({ x, y });
  const isActive = activeWindow === id;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      drag
      dragMomentum={false}
      onDrag={(e, info) => {
        setPosition({ x: position.x + info.delta.x, y: position.y + info.delta.y });
      }}
      onDragEnd={() => {
        updateWindow(id, { x: position.x, y: position.y });
      }}
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        width,
        height,
        zIndex: isActive ? 40 : 30,
      }}
      onPointerDown={() => setActiveWindow(id)}
      className="glassmorphism-dark rounded-xl flex flex-col overflow-hidden border border-white/20 shadow-2xl"
    >
      {/* Title Bar */}
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${type === 'spreadsheet' ? 'bg-[#00F2FF]' : type === 'graph' ? 'bg-[#7000FF]' : 'bg-white'}`} />
          <span className="text-sm font-medium tracking-wide font-jetbrains-mono">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-white/50 hover:text-white transition-colors"><Minus size={16} /></button>
          <button className="text-white/50 hover:text-white transition-colors"><Maximize2 size={14} /></button>
          <button onClick={() => closeWindow(id)} className="text-white/50 hover:text-red-400 transition-colors"><X size={18} /></button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 cursor-auto" onPointerDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </motion.div>
  );
}

export default function Workspace() {
  const windows = useStore((state) => state.windows);
  
  // Render only client side to avoid hydration mismatch with window storage
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="relative w-full h-full pointer-events-auto">
        {windows.map((win) => (
          <WindowContainer key={win.id} windowData={win}>
            <div className="w-full h-full flex items-center justify-center text-white/30 font-jetbrains-mono">
              [{win.type.toUpperCase()} MODULE PLACEHOLDER]
            </div>
          </WindowContainer>
        ))}
      </div>
    </div>
  );
}
