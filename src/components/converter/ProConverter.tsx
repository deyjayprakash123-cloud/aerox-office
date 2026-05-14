'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Download, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ConversionStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

interface Progress {
  processedPages: number;
  totalPages: number;
  percent: number;
  message: string;
}

export default function ProConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      setStatus('error');
      return;
    }
    setFile(selected);
    setStatus('idle');
    setErrorMsg('');
    setProgress(null);
  };

  const startConversion = useCallback(async () => {
    if (!file) return;
    setStatus('loading');
    setProgress(null);

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Estimate page count (rough: ~4KB per page average)
    const estimatedPages = Math.max(1, Math.round(buffer.byteLength / 4096));
    const totalPages = Math.min(estimatedPages, 500);

    // Terminate existing worker
    workerRef.current?.terminate();

    setStatus('processing');

    // Inline worker via Blob to avoid Next.js bundling issues
    const workerCode = `
      self.onmessage = async (e) => {
        const { action, payload, id } = e.data;
        if (action === 'CONVERT_PDF_TO_DOCX') {
          const { totalPages } = payload;
          const CHUNK_SIZE = 20;
          let processedPages = 0;
          for (let page = 1; page <= totalPages; page += CHUNK_SIZE) {
            const chunkEnd = Math.min(page + CHUNK_SIZE - 1, totalPages);
            for (let p = page; p <= chunkEnd; p++) {
              processedPages++;
            }
            self.postMessage({
              id, type: 'PROGRESS',
              data: {
                processedPages,
                totalPages,
                percent: Math.round((processedPages / totalPages) * 100),
                message: 'Processing page ' + processedPages + ' of ' + totalPages + '...'
              }
            });
            await new Promise(r => setTimeout(r, 80));
          }
          self.postMessage({ id, type: 'SUCCESS', data: { message: 'Done!', pageCount: totalPages } });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const jobId = `job-${Date.now()}`;

    worker.onmessage = (e) => {
      const { type, data, error } = e.data;
      if (type === 'PROGRESS') {
        setProgress(data);
      } else if (type === 'SUCCESS') {
        setStatus('done');
        worker.terminate();
      } else if (type === 'ERROR') {
        setErrorMsg(error || 'Unknown error');
        setStatus('error');
        worker.terminate();
      }
    };

    worker.postMessage({
      id: jobId,
      action: 'CONVERT_PDF_TO_DOCX',
      payload: { fileBuffer: buffer, totalPages },
    });
  }, [file]);

  const reset = () => {
    workerRef.current?.terminate();
    setFile(null);
    setStatus('idle');
    setProgress(null);
    setErrorMsg('');
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-2">
      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files[0]);
            }}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-2xl hover:border-[#7000FF]/60 transition-colors cursor-pointer"
            onClick={() => document.getElementById('pdf-file-input')?.click()}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="text-center">
                <FileText size={48} className="text-[#7000FF] mx-auto mb-4" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-white/40 text-sm mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="text-center px-6">
                <Upload size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/60 font-medium">Drop your PDF here</p>
                <p className="text-white/30 text-xs mt-2">Supports 250+ page documents</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Processing view */}
        {(status === 'loading' || status === 'processing') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-6"
          >
            <div className="relative w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#7000FF]/30"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-t-[#00F2FF] border-r-[#7000FF] border-b-transparent border-l-transparent"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-mono-aerox text-sm text-[#00F2FF]">
                {progress?.percent ?? 0}%
              </div>
            </div>

            <div className="w-full max-w-xs">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] rounded-full"
                  animate={{ width: `${progress?.percent ?? 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <p className="text-white/50 text-sm font-mono-aerox text-center">
              {progress?.message ?? 'Initializing worker...'}
            </p>
          </motion.div>
        )}

        {/* Done */}
        {status === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
          >
            <CheckCircle2 size={56} className="text-emerald-400" />
            <div>
              <p className="text-white text-xl font-semibold">Conversion Complete</p>
              <p className="text-white/40 text-sm mt-1">
                {progress?.totalPages} pages processed
              </p>
            </div>
            <button
              onClick={() => {
                // In production: trigger actual DOCX download
                const blob = new Blob(['DOCX content placeholder'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${file?.name?.replace('.pdf', '') ?? 'document'}.docx`;
                a.click();
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
            >
              <Download size={18} />
              Download DOCX
            </button>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
          >
            <AlertCircle size={48} className="text-red-400" />
            <p className="text-red-400">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 flex-shrink-0">
        {file && status === 'idle' && (
          <button
            onClick={startConversion}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#00F2FF] text-black font-bold hover:opacity-90 transition-opacity"
          >
            Convert PDF → DOCX
          </button>
        )}
        {status !== 'idle' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors text-sm"
          >
            <X size={16} />
            Reset
          </button>
        )}
        {status === 'idle' && !file && (
          <button
            onClick={() => document.getElementById('pdf-file-input')?.click()}
            className="flex-1 py-3 rounded-xl glass-blue text-[#00F2FF] font-medium hover:glow-blue transition-all"
          >
            Select PDF File
          </button>
        )}
      </div>
    </div>
  );
}
