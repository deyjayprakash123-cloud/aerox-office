'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, Download, X, RefreshCw, CheckCircle2,
  AlertCircle, Gauge, Image as ImageIcon, FileText, Archive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
type CompressMode = 'image' | 'pdf';
type CompressStatus = 'idle' | 'processing' | 'done' | 'error';

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

// ── Image Compression via Canvas ──────────────────────────────────────────────
async function compressImage(file: File, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      // Also shrink large images by 0.85x to reduce dimensions
      const scale = img.width > 3000 ? 0.7 : img.width > 1500 ? 0.85 : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = file.type === 'image/png' ? 'image/jpeg' : file.type;
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas compression failed')),
        mime,
        quality / 100
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

// ── PDF Compression via pdf-lib ───────────────────────────────────────────────
async function compressPdf(file: File, onProgress: (pct: number) => void): Promise<Blob> {
  const buf = await file.arrayBuffer();
  onProgress(20);
  const { PDFDocument } = await import('pdf-lib');
  onProgress(40);
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  onProgress(60);
  const outDoc = await PDFDocument.create();
  const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  pages.forEach((p) => outDoc.addPage(p));
  onProgress(80);
  const bytes = await outDoc.save({ useObjectStreams: true });
  onProgress(100);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── Mode Config ───────────────────────────────────────────────────────────────
const MODES = [
  { id: 'image' as CompressMode, label: 'Image', icon: ImageIcon, color: '#FF6B6B', accept: 'image/jpeg,image/png,image/webp' },
  { id: 'pdf'   as CompressMode, label: 'PDF',   icon: FileText,  color: '#7000FF', accept: 'application/pdf' },
];

// ── Savings Badge ─────────────────────────────────────────────────────────────
function SavingsBadge({ before, after }: { before: number; after: number }) {
  const saved = before - after;
  const pct = Math.round((saved / before) * 100);
  return (
    <div className="flex gap-3 text-xs mt-1">
      <span className="text-white/40">{formatBytes(before)}</span>
      <span className="text-white/20">→</span>
      <span className="text-emerald-400 font-semibold">{formatBytes(after)}</span>
      <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
        -{pct}%
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FileCompressor() {
  const [mode, setMode] = useState<CompressMode>('image');
  const [file, setFile]           = useState<File | null>(null);
  const [quality, setQuality]     = useState(72);
  const [status, setStatus]       = useState<CompressStatus>('idle');
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<{ blob: Blob; size: number } | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const reset = () => {
    setFile(null); setStatus('idle'); setProgress(0); setResult(null); setErrorMsg('');
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    reset();
    setFile(f);
  };

  const compress = useCallback(async () => {
    if (!file) return;
    setStatus('processing');
    setProgress(0);
    try {
      let blob: Blob;
      if (mode === 'image') {
        setProgress(30);
        blob = await compressImage(file, quality);
        setProgress(100);
      } else {
        blob = await compressPdf(file, setProgress);
      }
      setResult({ blob, size: blob.size });
      setStatus('done');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Compression failed.');
      setStatus('error');
    }
  }, [file, mode, quality]);

  const download = () => {
    if (!result || !file) return;
    const ext = mode === 'image' ? (file.type === 'image/png' ? 'jpg' : file.name.split('.').pop()) : 'pdf';
    const base = file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = `${base}-compressed.${ext}`;
    a.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-5 p-1 glass rounded-2xl">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); reset(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={
              mode === m.id
                ? { background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }
                : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
            }
          >
            <m.icon size={14} />
            {m.label} Compressor
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden" style={{ minHeight: 300 }}>
        <AnimatePresence mode="wait">
          {/* ── Idle / Upload ── */}
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 py-10"
                style={{
                  borderColor: dragging ? currentMode.color : 'rgba(255,255,255,0.15)',
                  background: dragging ? `${currentMode.color}08` : 'transparent',
                }}
              >
                <input ref={inputRef} type="file" accept={currentMode.accept} className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="text-center w-full px-6">
                    <currentMode.icon size={36} style={{ color: currentMode.color }} className="mx-auto mb-3" />
                    <p className="text-white font-medium text-sm truncate">{file.name}</p>
                    <p className="text-white/40 text-xs mt-1">{formatBytes(file.size)}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `${currentMode.color}15`, border: `1px solid ${currentMode.color}30` }}>
                      <Archive size={24} style={{ color: currentMode.color }} />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-white/70 font-medium text-sm">
                        Drop your <span style={{ color: currentMode.color }}>
                          {mode === 'image' ? 'image (JPEG/PNG/WebP)' : 'PDF file'}
                        </span> here
                      </p>
                      <p className="text-white/30 text-xs mt-1">or tap to browse</p>
                    </div>
                  </>
                )}
              </div>

              {/* Quality slider for images */}
              {file && mode === 'image' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1.5"><Gauge size={12} />Quality</span>
                    <span style={{ color: currentMode.color }} className="font-semibold">{quality}%</span>
                  </div>
                  <input type="range" min={20} max={95} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${currentMode.color} 0%, ${currentMode.color} ${((quality - 20) / 75) * 100}%, rgba(255,255,255,0.1) ${((quality - 20) / 75) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-white/20">
                    <span>Smaller file</span><span>Better quality</span>
                  </div>
                </motion.div>
              )}

              {file && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={compress}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${currentMode.color}, ${mode === 'image' ? '#FF9A6B' : '#00F2FF'})`,
                    color: '#000', boxShadow: `0 0 24px ${currentMode.color}40`,
                  }}
                >
                  <Archive size={15} />
                  Compress {mode === 'image' ? 'Image' : 'PDF'}
                </motion.button>
              )}

              {!file && (
                <button onClick={() => inputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl font-medium text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all">
                  Browse files
                </button>
              )}
            </motion.div>
          )}

          {/* ── Processing ── */}
          {status === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center justify-center gap-6" style={{ minHeight: 300 }}>
              <div className="relative w-20 h-20">
                <motion.div className="absolute inset-0 rounded-full border-2 border-white/10"
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} />
                <motion.div className="absolute inset-1.5 rounded-full border-2"
                  style={{ borderColor: `${currentMode.color} transparent transparent ${currentMode.color}` }}
                  animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold"
                  style={{ color: currentMode.color }}>{progress}%</div>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${currentMode.color}, ${mode === 'image' ? '#FF9A6B' : '#00F2FF'})` }}
                    animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
              <p className="text-white/50 text-xs font-mono">Compressing {mode === 'image' ? 'image' : 'PDF'}…</p>
            </motion.div>
          )}

          {/* ── Done ── */}
          {status === 'done' && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="p-8 flex flex-col items-center justify-center gap-5 text-center" style={{ minHeight: 300 }}>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="w-full max-w-xs">
                <p className="text-white font-semibold text-lg mb-2">Compressed!</p>
                <SavingsBadge before={file!.size} after={result.size} />
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <button onClick={download}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                  <Download size={15} />Download
                </button>
                <button onClick={reset}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl glass text-white/50 hover:text-white transition-colors text-sm">
                  <RefreshCw size={15} />Again
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-8 flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: 300 }}>
              <AlertCircle size={40} className="text-red-400" />
              <p className="text-red-400 text-sm">{errorMsg}</p>
              <button onClick={reset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-white/60 hover:text-white transition-colors text-sm">
                <RefreshCw size={14} />Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/25">
        <span>JPEG · PNG · WebP · PDF</span>
        <span>·</span>
        <span>100% Private · No uploads</span>
      </div>
    </div>
  );
}
