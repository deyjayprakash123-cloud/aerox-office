'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, BarChart3, FileTerminal, Home, Archive, FileImage } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useState } from 'react';

const ITEMS = [
  { type: 'spreadsheet' as const, icon: Grid3X3,     label: 'Data Grid',       color: '#00F2FF' },
  { type: 'graph'       as const, icon: BarChart3,   label: 'Graph Sandbox',   color: '#7000FF' },
  { type: 'converter'   as const, icon: FileTerminal, label: 'Pro Converter',  color: '#FF6B6B' },
  { type: 'compressor'  as const, icon: Archive,     label: 'File Compressor', color: '#FF9A6B' },
  { type: 'pdfmaker'    as const, icon: FileImage,   label: 'PDF Maker',       color: '#FFD166' },
];

export default function Dock() {
  const [hovered, setHovered] = useState<string | null>(null);
  const addWindow = useStore((s) => s.addWindow);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-dark rounded-2xl px-4 py-3 flex items-end gap-2 border border-white/10 shadow-2xl">
        {/* Home Button */}
        <div className="relative" onMouseEnter={() => setHovered('home')} onMouseLeave={() => setHovered(null)}>
          <motion.div
            animate={{ scale: hovered === 'home' ? 1.25 : 1, y: hovered === 'home' ? -8 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link href="/">
              <button className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <Home size={22} className="text-white/60" />
              </button>
            </Link>
          </motion.div>
          <AnimatePresence>
            {hovered === 'home' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 glass px-3 py-1.5 rounded-lg text-xs whitespace-nowrap text-white/70"
              >
                Landing Page
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {ITEMS.map(({ type, icon: Icon, label, color }) => (
          <div
            key={type}
            className="relative"
            onMouseEnter={() => setHovered(type)}
            onMouseLeave={() => setHovered(null)}
          >
            <motion.div
              animate={{
                scale: hovered === type ? 1.3 : hovered ? 0.95 : 1,
                y: hovered === type ? -10 : 0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <button
                onClick={() => addWindow(type)}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                style={{
                  background: hovered === type ? `${color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${hovered === type ? `${color}40` : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: hovered === type ? `0 0 16px ${color}40` : 'none',
                }}
              >
                <Icon size={22} style={{ color: hovered === type ? color : 'rgba(255,255,255,0.6)' }} />
              </button>
            </motion.div>
            <AnimatePresence>
              {hovered === type && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 glass px-3 py-1.5 rounded-lg text-xs whitespace-nowrap"
                  style={{ color, borderColor: `${color}30` }}
                >
                  {label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
