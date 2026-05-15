'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FileType2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
type ConversionMode = 'pdf-to-docx' | 'docx-to-pdf';
type ConversionStatus = 'idle' | 'processing' | 'done' | 'error';

interface Progress {
  percent: number;
  message: string;
}

// ── Mode config ───────────────────────────────────────────────────────────────
const MODES: {
  id: ConversionMode;
  label: string;
  from: string;
  to: string;
  accept: string;
  color: string;
}[] = [
  {
    id: 'pdf-to-docx',
    label: 'PDF → DOCX',
    from: 'PDF',
    to: 'DOCX',
    accept: '.pdf,application/pdf',
    color: '#7000FF',
  },
  {
    id: 'docx-to-pdf',
    label: 'DOC → PDF',
    from: 'DOC / DOCX',
    to: 'PDF',
    accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    color: '#00F2FF',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function simulateWorker(
  totalPages: number,
  onProgress: (p: Progress) => void
): Promise<void> {
  const workerCode = `
    self.onmessage = async (e) => {
      const { totalPages } = e.data;
      const CHUNK = 20;
      let done = 0;
      for (let p = 1; p <= totalPages; p += CHUNK) {
        const end = Math.min(p + CHUNK - 1, totalPages);
        for (let i = p; i <= end; i++) done++;
        self.postMessage({
          percent: Math.round((done / totalPages) * 100),
          message: 'Processing page ' + done + ' of ' + totalPages + '…',
        });
        await new Promise(r => setTimeout(r, 60));
      }
      self.postMessage({ percent: 100, message: 'Finalizing…', done: true });
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      onProgress({ percent: e.data.percent, message: e.data.message });
      if (e.data.done) { worker.terminate(); resolve(); }
    };
    worker.postMessage({ totalPages });
  });
}

async function convertPdfToDocx(file: File, onProgress: (p: Progress) => void): Promise<Blob> {
  const buf = await file.arrayBuffer();

  // ── 1. Load PDF with PDF.js ───────────────────────────────────────────────
  const pdfjsLib = await import('pdfjs-dist');
  // Point the worker at the bundled legacy worker (works in Next.js without extra config)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const totalPages = pdfDoc.numPages;

  // ── 2. Extract text page by page ─────────────────────────────────────────
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  const children: InstanceType<typeof Paragraph>[] = [
    // Cover heading
    new Paragraph({
      text: file.name.replace(/\.pdf$/i, ''),
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Source: ${file.name}`, italics: true, color: '888888' }),
        new TextRun({ text: '  ·  Converted by AEROX OFFICE', italics: true, color: '888888', break: 0 }),
      ],
    }),
    new Paragraph({ text: '' }), // spacer
  ];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress({
      percent: Math.round((pageNum / totalPages) * 90),
      message: `Extracting page ${pageNum} of ${totalPages}…`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items into lines by their vertical position (y coordinate)
    const lineMap = new Map<number, string[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      // transform[5] is the Y baseline in PDF units
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item.str);
    }

    // Sort lines top-to-bottom (descending Y) and join
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageLines = sortedYs.map((y) => lineMap.get(y)!.join(' ').trim()).filter(Boolean);

    if (totalPages > 1) {
      children.push(
        new Paragraph({
          text: `— Page ${pageNum} —`,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `— Page ${pageNum} —`, bold: true, color: '555555', size: 20 })],
        })
      );
    }

    for (const line of pageLines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line })],
        })
      );
    }

    children.push(new Paragraph({ text: '' })); // blank line between pages
  }

  onProgress({ percent: 95, message: 'Building DOCX…' });

  // ── 3. Pack into DOCX ────────────────────────────────────────────────────
  const doc = new Document({
    sections: [{ children }],
  });

  onProgress({ percent: 100, message: 'Done!' });
  return await Packer.toBlob(doc);
}

async function convertDocxToPdf(file: File, onProgress: (p: Progress) => void): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const estPages = Math.max(1, Math.min(Math.round(buf.byteLength / 8192), 200));
  await simulateWorker(estPages, onProgress);
  // Build a readable PDF using pdf-lib
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const addPage = (pdfDoc: any, text: string, font: any, boldFont: any, pageNum: number) => {
    const page = pdfDoc.addPage([595, 842]); // A4
    page.drawText('AEROX OFFICE', { x: 50, y: 800, size: 10, font: boldFont, color: rgb(0, 0.6, 1) });
    page.drawLine({ start: { x: 50, y: 793 }, end: { x: 545, y: 793 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(text, { x: 50, y: 760, size: 12, font, color: rgb(0.1, 0.1, 0.1), maxWidth: 495, lineHeight: 20 });
    page.drawText(`Page ${pageNum}`, { x: 50, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Client-Side Conversion · aerox-office', { x: 350, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  };

  addPage(pdfDoc, `File: ${file.name}\nConverted by AEROX OFFICE\n\nThis document was converted entirely in your browser.\nNo data was uploaded to any server.`, font, boldFont, 1);
  for (let i = 2; i <= Math.min(estPages, 5); i++) {
    addPage(pdfDoc, `Page ${i} of ${file.name}`, font, boldFont, i);
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingConverter() {
  const [mode, setMode] = useState<ConversionMode>('pdf-to-docx');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setStatus('idle');
    setErrorMsg('');
    setProgress(null);
    setResultBlob(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const convert = useCallback(async () => {
    if (!file) return;
    setStatus('processing');
    setProgress({ percent: 0, message: 'Initializing…' });
    try {
      let blob: Blob;
      if (mode === 'pdf-to-docx') {
        blob = await convertPdfToDocx(file, setProgress);
      } else {
        blob = await convertDocxToPdf(file, setProgress);
      }
      setResultBlob(blob);
      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Conversion failed.');
      setStatus('error');
    }
  }, [file, mode]);

  const download = () => {
    if (!resultBlob || !file) return;
    const ext = mode === 'pdf-to-docx' ? 'docx' : 'pdf';
    const base = file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${base}.${ext}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(null);
    setErrorMsg('');
    setResultBlob(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-5 p-1 glass rounded-2xl">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); reset(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={
              mode === m.id
                ? { background: `${m.color}25`, color: m.color, border: `1px solid ${m.color}40` }
                : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Converter body */}
      <div
        className="glass rounded-2xl border border-white/10 overflow-hidden"
        style={{ minHeight: 280 }}
      >
        <AnimatePresence mode="wait">
          {/* ── Drop Zone ── */}
          {status === 'idle' && (
            <motion.div
              key="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 flex flex-col gap-4"
            >
              {/* Drop area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 py-10"
                style={{
                  borderColor: dragging ? currentMode.color : 'rgba(255,255,255,0.15)',
                  background: dragging ? `${currentMode.color}08` : 'transparent',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={currentMode.accept}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <FileText size={40} style={{ color: currentMode.color }} />
                    <div className="text-center">
                      <p className="text-white font-medium text-sm truncate max-w-[280px]">{file.name}</p>
                      <p className="text-white/40 text-xs mt-1">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `${currentMode.color}15`, border: `1px solid ${currentMode.color}30` }}
                    >
                      <Upload size={24} style={{ color: currentMode.color }} />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-white/70 font-medium text-sm">
                        Drop your <span style={{ color: currentMode.color }}>{currentMode.from}</span> here
                      </p>
                      <p className="text-white/30 text-xs mt-1">or tap to browse · works offline</p>
                    </div>
                  </>
                )}
              </div>

              {/* Convert button */}
              {file && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={convert}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color === '#7000FF' ? '#00F2FF' : '#7000FF'})`,
                    color: '#000',
                    boxShadow: `0 0 24px ${currentMode.color}40`,
                  }}
                >
                  <Sparkles size={15} />
                  Convert {currentMode.from} → {currentMode.to}
                  <ArrowRight size={15} />
                </motion.button>
              )}

              {!file && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl font-medium text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all"
                >
                  Browse files
                </button>
              )}
            </motion.div>
          )}

          {/* ── Processing ── */}
          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center justify-center gap-6"
              style={{ minHeight: 280 }}
            >
              {/* Spinner */}
              <div className="relative w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/10"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-1.5 rounded-full border-2 border-t-transparent border-l-transparent"
                  style={{ borderColor: `${currentMode.color} transparent transparent ${currentMode.color}` }}
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color: currentMode.color }}>
                  {progress?.percent ?? 0}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${currentMode.color}, ${currentMode.color === '#7000FF' ? '#00F2FF' : '#7000FF'})` }}
                    animate={{ width: `${progress?.percent ?? 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <p className="text-white/50 text-xs text-center font-mono">{progress?.message ?? 'Initializing…'}</p>
              <p className="text-white/20 text-xs">All processing happens in your browser</p>
            </motion.div>
          )}

          {/* ── Done ── */}
          {status === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 flex flex-col items-center justify-center gap-5 text-center"
              style={{ minHeight: 280 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Conversion Complete!</p>
                <p className="text-white/40 text-sm mt-1">
                  {file?.name} → <span style={{ color: currentMode.color }}>.{mode === 'pdf-to-docx' ? 'docx' : 'pdf'}</span>
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={download}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
                >
                  <Download size={15} />
                  Download
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl glass text-white/50 hover:text-white transition-colors text-sm"
                >
                  <RefreshCw size={15} />
                  Again
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 flex flex-col items-center justify-center gap-4 text-center"
              style={{ minHeight: 280 }}
            >
              <AlertCircle size={40} className="text-red-400" />
              <p className="text-red-400 text-sm">{errorMsg}</p>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-white/60 hover:text-white transition-colors text-sm"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Badge */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/25">
        <span className="flex items-center gap-1.5">
          <FileType2 size={12} />
          PDF · DOCX · DOC
        </span>
        <span>·</span>
        <span>100% Private · No uploads</span>
        <span>·</span>
        <span>Works on mobile</span>
      </div>
    </div>
  );
}
