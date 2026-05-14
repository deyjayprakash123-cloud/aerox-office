'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Grid3X3, FileText, BarChart3, Lock, Zap, Layers, ChevronDown, RefreshCw, Smartphone } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef } from 'react';

const LandingConverter  = dynamic(() => import('@/components/converter/LandingConverter'), { ssr: false });
const FileCompressor    = dynamic(() => import('@/components/converter/FileCompressor'),   { ssr: false });
const PdfMaker          = dynamic(() => import('@/components/converter/PdfMaker'),         { ssr: false });

const BackgroundAether = dynamic(() => import('@/components/BackgroundAether'), { ssr: false });

// ── Feature Card ────────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="glass rounded-2xl p-8 group cursor-default relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}15 0%, transparent 70%)`,
        }}
      />
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon size={26} style={{ color }} />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-white/50 leading-relaxed text-sm">{description}</p>
    </motion.div>
  );
}

// ── Mini Spreadsheet Preview ─────────────────────────────────────────────────────
function MiniSpreadsheet() {
  const cols = ['A', 'B', 'C', 'D'];
  const rows = [
    ['Revenue', '142,500', '168,200', '195,400'],
    ['Expenses', '89,200', '94,100', '101,800'],
    ['Profit', '=B2-B3', '=C2-C3', '=D2-D3'],
    ['Margin', '37.4%', '44.0%', '47.9%'],
    ['Growth', '—', '+18.0%', '+16.2%'],
  ];

  return (
    <div className="glass rounded-xl overflow-hidden font-mono-aerox text-xs">
      <div className="flex bg-white/5 border-b border-white/10">
        <div className="w-8 border-r border-white/10 py-2" />
        {cols.map((c) => (
          <div key={c} className="flex-1 text-center py-2 text-white/40 border-r border-white/10 last:border-r-0">
            {c}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="flex border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
        >
          <div className="w-8 border-r border-white/10 py-2 text-center text-white/30">{ri + 1}</div>
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`flex-1 py-2 px-2 border-r border-white/5 last:border-r-0 truncate ${
                cell.startsWith('=') ? 'text-[#00F2FF]' : ri === 2 ? 'text-emerald-400' : 'text-white/80'
              }`}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Steps Timeline ───────────────────────────────────────────────────────────────
function StepItem({
  num,
  title,
  desc,
  delay,
}: {
  num: string;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="flex gap-6 items-start"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full glass-blue flex items-center justify-center font-mono-aerox text-[#00F2FF] font-bold text-lg glow-blue">
        {num}
      </div>
      <div className="pt-1">
        <h4 className="text-white font-semibold text-lg mb-1">{title}</h4>
        <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">
      {/* Fixed 3D Background */}
      <BackgroundAether />

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between glass rounded-2xl px-6 py-3">
          <span className="font-mono-aerox text-gradient font-bold text-lg tracking-wider">
            AEROX OFFICE
          </span>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#converter" className="hover:text-white transition-colors hidden sm:block">Converter</a>
            <a href="#compress" className="hover:text-white transition-colors hidden md:block">Compress</a>
            <a href="#pdf-maker" className="hover:text-white transition-colors hidden md:block">PDF Maker</a>
            <a href="#convert-file"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10 transition-all"
            >
              <RefreshCw size={12} />
              Tools
            </a>
            <Link href="/app">
              <button className="px-4 py-2 rounded-xl glass-blue text-[#00F2FF] hover:glow-blue transition-all duration-300 text-sm font-medium">
                Open App
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 px-4 py-2 glass-blue rounded-full text-[#00F2FF] text-sm mb-8 font-mono-aerox"
        >
          <Zap size={14} />
          Client-Side Processing · Zero Data Uploaded
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-8xl font-bold mb-6 leading-[1.05] tracking-tight"
        >
          Your{' '}
          <span className="text-gradient">Spatial</span>
          <br />
          Office Suite.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mb-12 leading-relaxed"
        >
          Unlimited data grids, 250+ page PDF processing, and 3D graph sandboxes — all
          running in your browser. No servers. No subscriptions. No limits.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link href="/app">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-black bg-[#00F2FF] hover:bg-white transition-all duration-300 glow-blue"
            >
              Start Engineering
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
          <a href="#convert-file">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl glass text-white/70 hover:text-white transition-all duration-300 border border-white/10 hover:border-[#7000FF]/40"
            >
              <RefreshCw size={16} className="text-[#7000FF]" />
              Convert a File
            </motion.button>
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 text-white/20"
        >
          <ChevronDown size={24} />
        </motion.div>
      </motion.section>

      {/* ── Mini Spreadsheet Preview ── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-dark rounded-3xl p-6 border border-white/10"
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-white/30 font-mono-aerox">AEROX OFFICE — Data Grid</span>
            </div>
            <MiniSpreadsheet />
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="text-gradient">Engineers</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Every tool purpose-built for performance and privacy. No cloud, no compromise.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Grid3X3}
              title="Unlimited Data Grid"
              description="A 100,000+ row virtualized spreadsheet powered by TanStack Table and HyperFormula. Real formulas. Real performance. No DOM lag."
              color="#00F2FF"
              delay={0}
            />
            <FeatureCard
              icon={FileText}
              title="PDF ↔ DOCX Converter"
              description="Convert PDF→DOCX or DOC/DOCX→PDF entirely in your browser. Chunk-based Web Worker keeps your UI at 60fps even on 250+ page files."
              color="#7000FF"
              delay={0.1}
            />
            <FeatureCard
              icon={BarChart3}
              title="3D Graph Sandbox"
              description="Select a cell range and instantly visualize it as a Bar, Line, or Scatter chart inside a detachable, 3D-rotatable spatial window."
              color="#FF6B6B"
              delay={0.2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <FeatureCard
              icon={Lock}
              title="100% Private"
              description="All processing happens in your browser. No file is ever uploaded to a server. Your data never leaves your machine."
              color="#00F2FF"
              delay={0.3}
            />
            <FeatureCard
              icon={Smartphone}
              title="Mobile-Friendly Converter"
              description="The file converter works beautifully on phones and tablets. Drop a file, pick a format, and download — all from your mobile browser."
              color="#7000FF"
              delay={0.4}
            />
            <FeatureCard
              icon={Zap}
              title="60FPS Performance"
              description="Window virtualization, lazy loading, and a Three.js Aether background that reacts to your cursor — all at 60 frames per second."
              color="#FF6B6B"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ── Quick Converter ── */}
      <section id="convert-file" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-[#7000FF] text-xs font-mono-aerox mb-6 border border-[#7000FF]/30">
              <RefreshCw size={12} />
              Client-Side · No Uploads · Works on Mobile
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Convert a <span className="text-gradient">File Now</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              PDF to DOCX · DOC to PDF · All in your browser. No server. No signup.
              Works on every device including mobile.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <LandingConverter />
          </motion.div>

          {/* Supported formats badge row */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-10"
          >
            {['PDF → DOCX', 'DOC → PDF', 'DOCX → PDF'].map((fmt) => (
              <span
                key={fmt}
                className="px-4 py-2 rounded-full text-xs font-mono-aerox border border-white/10 text-white/40 glass"
              >
                {fmt}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-gradient-reverse">Works</span>
            </h2>
            <p className="text-white/40">Client-side architecture explained.</p>
          </motion.div>

          <div className="space-y-10">
            <StepItem
              num="01"
              title="Open in Your Browser"
              desc="No installation. No login. Navigate to /app and your workspace loads from local storage instantly."
              delay={0}
            />
            <div className="w-px h-8 bg-gradient-to-b from-[#00F2FF]/30 to-transparent ml-6" />
            <StepItem
              num="02"
              title="Load Your Data"
              desc="Drop a PDF file, paste your data into the grid, or start from a blank 100×26 sheet with formula support."
              delay={0.1}
            />
            <div className="w-px h-8 bg-gradient-to-b from-[#7000FF]/30 to-transparent ml-6" />
            <StepItem
              num="03"
              title="Worker Processes Heavyweights"
              desc="For PDFs with 250+ pages, a Web Worker takes over in a background thread. Your UI stays responsive — you see a live progress bar."
              delay={0.2}
            />
            <div className="w-px h-8 bg-gradient-to-b from-[#00F2FF]/30 to-transparent ml-6" />
            <StepItem
              num="04"
              title="Download Your Output"
              desc="The processed DOCX or chart renders instantly. Click download — the file is assembled in your browser and saved locally."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ── File Compressor ── */}
      <section id="compress" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-[#FF6B6B] text-xs font-mono-aerox mb-6 border border-[#FF6B6B]/30">
              <RefreshCw size={12} />
              Canvas API · pdf-lib · Zero Uploads
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Compress <span style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF9A6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Files</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              Shrink images (JPEG/PNG/WebP) with a quality slider, or reduce PDF file size — entirely in your browser.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <FileCompressor />
          </motion.div>
        </div>
      </section>

      {/* ── PDF Maker ── */}
      <section id="pdf-maker" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-[#FF6B6B] text-xs font-mono-aerox mb-6 border border-[#FF6B6B]/30">
              <Layers size={12} />
              Images to PDF · Up to 25 Pages · A4 Auto-Fit
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Build a <span style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF9A6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PDF</span> from Images
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              Upload up to 25 images, reorder them by drag or arrows, and generate a professional A4 PDF — all client-side.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <PdfMaker />
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass rounded-3xl p-16 border border-[#00F2FF]/20 glow-blue"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to{' '}
              <span className="text-gradient">Engineer</span>?
            </h2>
            <p className="text-white/40 mb-10 text-lg">
              Your spatial workspace is waiting. No sign-up required.
            </p>
            <Link href="/app">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-black bg-[#00F2FF] hover:bg-white transition-all duration-300 glow-blue text-lg"
              >
                Launch AEROX OFFICE
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-white/20 text-sm font-mono-aerox">
          <span>AEROX OFFICE v1.0</span>
          <span>Spatial Productivity Suite · Client-Side Only</span>
        </div>
      </footer>
    </div>
  );
}
