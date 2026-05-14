'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, Download, X, RefreshCw, CheckCircle2,
  AlertCircle, Image as ImageIcon, ArrowUp, ArrowDown,
  FileImage, Sparkles, Plus,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

const MAX_PAGES = 25;

type Status = 'idle' | 'building' | 'done' | 'error';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function PdfMaker() {
  const [images, setImages]       = useState<ImageItem[]>([]);
  const [status, setStatus]       = useState<Status>('idle');
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [resultBlob, setResultBlob]   = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [dragging, setDragging]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      if (images.length + newItems.length >= MAX_PAGES) break;
      newItems.push({
        id: `${Date.now()}-${i}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        name: f.name,
      });
    }
    setImages((prev) => [...prev, ...newItems].slice(0, MAX_PAGES));
  }, [images]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const buildPdf = useCallback(async () => {
    if (images.length === 0) return;
    setStatus('building');
    setProgress(0);
    setProgressMsg('Loading pdf-lib…');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setProgressMsg(`Embedding image ${i + 1} of ${images.length}…`);
        setProgress(Math.round((i / images.length) * 90));

        const buf = await item.file.arrayBuffer();
        let embeddedImage;

        const mime = item.file.type;
        if (mime === 'image/jpeg' || mime === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(buf);
        } else {
          // For PNG, WebP, and others — convert to JPEG via canvas first
          embeddedImage = await (async () => {
            const img = new Image();
            const url = URL.createObjectURL(item.file);
            await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')!.drawImage(img, 0, 0);
            const jpegBuf = await new Promise<ArrayBuffer>((res, rej) =>
              canvas.toBlob((b) => b ? b.arrayBuffer().then(res) : rej(new Error('Canvas failed')), 'image/jpeg', 0.92)
            );
            return pdfDoc.embedJpg(jpegBuf);
          })();
        }

        // A4 landscape if image is wider than tall, otherwise portrait
        const { width: iw, height: ih } = embeddedImage;
        const A4_W = 595, A4_H = 842;
        const landscape = iw > ih;
        const pageW = landscape ? A4_H : A4_W;
        const pageH = landscape ? A4_W : A4_H;

        const page = pdfDoc.addPage([pageW, pageH]);

        // Scale image to fill page with 20pt padding
        const PAD = 20;
        const availW = pageW - PAD * 2;
        const availH = pageH - PAD * 2;
        const scale = Math.min(availW / iw, availH / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;

        page.drawImage(embeddedImage, {
          x: (pageW - drawW) / 2,
          y: (pageH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      setProgressMsg('Saving PDF…');
      setProgress(95);
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setResultBlob(blob);
      setProgress(100);
      setStatus('done');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'PDF creation failed.');
      setStatus('error');
    }
  }, [images]);

  const download = () => {
    if (!resultBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `aerox-pdf-${Date.now()}.pdf`;
    a.click();
  };

  const reset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]); setStatus('idle'); setProgress(0);
    setProgressMsg(''); setResultBlob(null); setErrorMsg('');
  };

  const slotsLeft = MAX_PAGES - images.length;
  const atLimit = images.length >= MAX_PAGES;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header info */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileImage size={16} className="text-[#FF6B6B]" />
            Images → PDF Maker
          </div>
          <p className="text-white/30 text-xs mt-0.5">Up to {MAX_PAGES} images · A4 pages · Auto-fit</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className={`font-bold ${atLimit ? 'text-orange-400' : 'text-white/60'}`}>{images.length}</span>
          <span>/ {MAX_PAGES} pages</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Building ── */}
        {status === 'building' && (
          <motion.div key="building" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-white/10 p-12 flex flex-col items-center justify-center gap-6">
            <div className="relative w-20 h-20">
              <motion.div className="absolute inset-0 rounded-full border-2 border-white/10"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} />
              <motion.div className="absolute inset-1.5 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF9A6B] border-b-transparent border-l-transparent"
                animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-[#FF6B6B]">{progress}%</div>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9A6B]"
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>
            <p className="text-white/50 text-xs font-mono text-center">{progressMsg}</p>
          </motion.div>
        )}

        {/* ── Done ── */}
        {status === 'done' && resultBlob && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl border border-emerald-500/20 p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">PDF Created!</p>
              <p className="text-white/40 text-sm mt-1">
                {images.length} page{images.length !== 1 ? 's' : ''} · {formatBytes(resultBlob.size)}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={download}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                <Download size={15} />Download PDF
              </button>
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-3 rounded-xl glass text-white/50 hover:text-white transition-colors text-sm">
                <RefreshCw size={15} />New PDF
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl border border-white/10 p-10 flex flex-col items-center gap-4 text-center">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-white/60 hover:text-white transition-colors text-sm">
              <RefreshCw size={14} />Try again
            </button>
          </motion.div>
        )}

        {/* ── Idle / Upload / Preview ── */}
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files); }}
              onClick={() => !atLimit && inputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 py-8 cursor-pointer"
              style={{
                borderColor: dragging ? '#FF6B6B' : atLimit ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.15)',
                background: dragging ? 'rgba(255,107,107,0.05)' : 'transparent',
                cursor: atLimit ? 'not-allowed' : 'pointer',
              }}
            >
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
                onChange={(e) => addImages(e.target.files)} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)' }}>
                <Plus size={22} className="text-[#FF6B6B]" />
              </div>
              {atLimit ? (
                <p className="text-orange-400 text-sm font-medium">Page limit reached ({MAX_PAGES}/{MAX_PAGES})</p>
              ) : (
                <div className="text-center px-4">
                  <p className="text-white/70 font-medium text-sm">
                    Add <span className="text-[#FF6B6B]">images</span> (JPEG, PNG, WebP)
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} remaining · {images.length > 0 ? 'tap to add more' : 'drag & drop or tap to browse'}
                  </p>
                </div>
              )}
            </div>

            {/* Image Thumbnails (reorderable) */}
            {images.length > 0 && (
              <div className="glass rounded-2xl border border-white/10 p-3 space-y-2 max-h-72 overflow-y-auto">
                <p className="text-xs text-white/30 px-2 pb-1">Page order — drag rows to reorder</p>
                <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
                  {images.map((img, idx) => (
                    <Reorder.Item key={img.id} value={img}>
                      <motion.div
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 transition-colors cursor-grab active:cursor-grabbing"
                        whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-xs font-medium truncate">{img.name}</p>
                          <p className="text-white/30 text-xs">{formatBytes(img.file.size)}</p>
                        </div>
                        {/* Page badge */}
                        <span className="text-xs font-mono text-white/30 flex-shrink-0">p.{idx + 1}</span>
                        {/* Move buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => moveImage(idx, -1)} disabled={idx === 0}
                            className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors">
                            <ArrowUp size={11} />
                          </button>
                          <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}
                            className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors">
                            <ArrowDown size={11} />
                          </button>
                        </div>
                        {/* Remove */}
                        <button onClick={() => removeImage(img.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
                          <X size={11} />
                        </button>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}

            {/* Limit warning */}
            {atLimit && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400">
                <ImageIcon size={13} />
                Maximum {MAX_PAGES} pages reached. Remove images to add more.
              </motion.div>
            )}

            {/* Build button */}
            {images.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                onClick={buildPdf}
                className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF6B6B, #FF9A6B)',
                  color: '#000',
                  boxShadow: '0 0 28px rgba(255,107,107,0.4)',
                }}
              >
                <Sparkles size={15} />
                Build PDF · {images.length} page{images.length !== 1 ? 's' : ''}
              </motion.button>
            )}

            {images.length === 0 && (
              <p className="text-center text-xs text-white/20 py-2">
                Upload images above to start building your PDF
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-4 mt-5 text-xs text-white/20">
        <span className="flex items-center gap-1.5"><ImageIcon size={11} />JPEG · PNG · WebP · GIF</span>
        <span>·</span>
        <span>Max {MAX_PAGES} pages</span>
        <span>·</span>
        <span>100% Private</span>
      </div>
    </div>
  );
}
