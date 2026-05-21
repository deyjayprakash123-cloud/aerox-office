'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, Image as ImageIcon, Sparkles, Sliders, Download, 
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, 
  Italic, Underline, ChevronDown, RefreshCw, Layers, CheckCircle2, 
  Smile, ShieldCheck, Undo2, X, Maximize, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Type definitions ---
type ElementType = 'image' | 'sticker';

interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // percentage of page width (0 to 100)
  y: number; // percentage of page height (0 to 100)
  width: number; // percentage of page width
  height: number; // percentage of page height
  rotate: number; // degrees
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // Base64 data URL
  originalSrc?: string; // Keep backup for background removal undo
  name: string;
}

interface StickerElement extends BaseElement {
  type: 'sticker';
  stickerType: string; // emoji character
}

type DocElement = ImageElement | StickerElement;

interface DocPage {
  id: string;
  textHtml: string;
  elements: DocElement[];
}

const FONTS = [
  { name: 'Inter (Sans)', value: 'var(--font-inter), sans-serif' },
  { name: 'Playfair (Serif)', value: 'Playfair Display, Georgia, serif' },
  { name: 'JetBrains (Mono)', value: 'var(--font-jetbrains-mono), monospace' },
  { name: 'Great Vibes (Script)', value: 'Great Vibes, Brush Script MT, cursive' },
  { name: 'Fredoka (Rounded)', value: 'Fredoka, QuickSand, sans-serif' },
  { name: 'Cinzel (Elegant)', value: 'Cinzel, Times New Roman, serif' }
];

const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40];

const STICKERS = [
  { char: '⭐', label: 'Star' },
  { char: '❤️', label: 'Heart' },
  { char: '✨', label: 'Sparkles' },
  { char: '🔥', label: 'Fire' },
  { char: '💡', label: 'Idea' },
  { char: '🎈', label: 'Balloon' },
  { char: '🎨', label: 'Palette' },
  { char: '🏆', label: 'Trophy' },
  { char: '🚀', label: 'Rocket' },
  { char: '🎉', label: 'Party' },
  { char: '🐱', label: 'Cute Cat' },
  { char: '🍀', label: 'Lucky Clover' },
  { char: '💬', label: 'Bubble' }
];

const CURATED_COLORS = [
  { name: 'Dark', value: '#1a1a1a' },
  { name: 'Grey', value: '#4b5563' },
  { name: 'Blue', value: '#1e3a8a' },
  { name: 'Gold', value: '#b45309' },
  { name: 'Red', value: '#be123c' },
  { name: 'Green', value: '#047857' },
  { name: 'Purple', value: '#6d28d9' }
];

export default function WordMaker() {
  const [pages, setPages] = useState<DocPage[]>([
    {
      id: 'page-1',
      textHtml: `
        <h1>Welcome to DocCraft Studio</h1>
        <p>This is your distraction-free document canvas. You can click anywhere in this area to start typing directly. Text formatting (like bold, italics, text color, alignments, and headings) can be applied seamlessly using the toolbar above.</p>
        <p>Use the sidebar on the left to upload images or insert emojis and shapes. These elements float on top of the text and can be dragged, resized, and rotated freely.</p>
      `,
      elements: [
        {
          id: 'stk-1',
          type: 'sticker',
          x: 82,
          y: 6,
          width: 8,
          height: 6,
          rotate: 15,
          stickerType: '✨'
        } as StickerElement
      ]
    }
  ]);

  const [activePageId, setActivePageId] = useState<string>('page-1');
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'idle' | 'pdf' | 'docx' | 'success'>('idle');
  const [progress, setProgress] = useState(0);

  // Background Remover Modal State
  const [bgRemoverImg, setBgRemoverImg] = useState<ImageElement | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [selectedBgColor, setSelectedBgColor] = useState<{r: number, g: number, b: number} | null>(null);
  const bgRemoverCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgRemoverImageRef = useRef<HTMLImageElement>(null);

  // Layout page size constants
  const PAGE_WIDTH_PX = 680;
  const PAGE_HEIGHT_PX = 960; // scaled A4 aspect ratio

  // Dragging and Resizing state
  const [dragState, setDragState] = useState<{
    id: string;
    pageId: string;
    startX: number;
    startY: number;
    startElX: number;
    startElY: number;
    startWidth: number;
    startHeight: number;
    startRotate: number;
    mode: 'drag' | 'resize' | 'rotate';
    pageWidth: number;
    pageHeight: number;
  } | null>(null);

  // Find currently selected element across all pages
  const getSelectedElement = (): DocElement | null => {
    for (const page of pages) {
      const el = page.elements.find(e => e.id === selectedElId);
      if (el) return el;
    }
    return null;
  };
  const selectedEl = getSelectedElement();

  // Initialize browser style mode for contenteditable
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch (err) {
        console.warn('CSS styling mode not supported', err);
      }
    }
  }, []);

  // Sync back to state when text editing is complete
  const updatePageText = (pageId: string, html: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, textHtml: html } : p));
  };

  // --- Element CRUD ---
  const addSticker = (char: string) => {
    const newSticker: StickerElement = {
      id: `stk-${Date.now()}`,
      type: 'sticker',
      x: 35,
      y: 35,
      width: 12,
      height: 9,
      rotate: 0,
      stickerType: char
    };

    setPages(prev => prev.map(p => 
      p.id === activePageId ? { ...p, elements: [...p.elements, newSticker] } : p
    ));
    setSelectedElId(newSticker.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const newImg: ImageElement = {
        id: `img-${Date.now()}`,
        type: 'image',
        x: 25,
        y: 30,
        width: 45,
        height: 35,
        rotate: 0,
        src: src,
        originalSrc: src,
        name: file.name
      };

      setPages(prev => prev.map(p => 
        p.id === activePageId ? { ...p, elements: [...p.elements, newImg] } : p
      ));
      setSelectedElId(newImg.id);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // clear
  };

  const updateElement = (id: string, updates: Partial<DocElement>) => {
    setPages(prev => prev.map(p => ({
      ...p,
      elements: p.elements.map(e => e.id === id ? { ...e, ...updates } as DocElement : e)
    })));
  };

  const deleteElement = (id: string) => {
    setPages(prev => prev.map(p => ({
      ...p,
      elements: p.elements.filter(e => e.id !== id)
    })));
    setSelectedElId(null);
  };

  // --- Page Controls ---
  const addPage = () => {
    const newId = `page-${Date.now()}`;
    const newPage: DocPage = {
      id: newId,
      textHtml: '<p><br></p>',
      elements: []
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newId);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    const pageIndex = pages.findIndex(p => p.id === id);
    setPages(prev => prev.filter(p => p.id !== id));
    
    // Set fallback active page
    const nextActiveIndex = Math.max(0, pageIndex - 1);
    const remainingPages = pages.filter(p => p.id !== id);
    if (remainingPages[nextActiveIndex]) {
      setActivePageId(remainingPages[nextActiveIndex].id);
    }
    setSelectedElId(null);
  };

  // --- Text Formatting Helpers ---
  const handleFormat = (command: string, value: string = '') => {
    if (typeof window === 'undefined') return;
    document.execCommand(command, false, value);
    
    // Save current HTML output
    const editor = document.getElementById(`page-text-${activePageId}`);
    if (editor) {
      updatePageText(activePageId, editor.innerHTML);
    }
  };

  const handleFontSizeChange = (size: number) => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Selection hack: apply unique temporary text color
    const tempColor = '#000001';
    document.execCommand('foreColor', false, tempColor);
    
    const editor = document.getElementById(`page-text-${activePageId}`);
    if (editor) {
      const fontTags = editor.querySelectorAll(`font[color="${tempColor}"]`);
      fontTags.forEach(tag => {
        tag.removeAttribute('color');
        (tag as HTMLElement).style.fontSize = `${size}px`;
      });
      const spanTags = editor.querySelectorAll(`span`);
      spanTags.forEach(tag => {
        if (tag.style.color === 'rgb(0, 0, 1)' || tag.style.color === '#000001') {
          tag.style.color = '';
          tag.style.fontSize = `${size}px`;
        }
      });
      updatePageText(activePageId, editor.innerHTML);
    }
  };

  const handleFontFamilyChange = (font: string) => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const tempColor = '#000002';
    document.execCommand('foreColor', false, tempColor);
    
    const editor = document.getElementById(`page-text-${activePageId}`);
    if (editor) {
      const fontTags = editor.querySelectorAll(`font[color="${tempColor}"]`);
      fontTags.forEach(tag => {
        tag.removeAttribute('color');
        (tag as HTMLElement).style.fontFamily = font;
      });
      const spanTags = editor.querySelectorAll(`span`);
      spanTags.forEach(tag => {
        if (tag.style.color === 'rgb(0, 0, 2)' || tag.style.color === '#000002') {
          tag.style.color = '';
          tag.style.fontFamily = font;
        }
      });
      updatePageText(activePageId, editor.innerHTML);
    }
  };

  // --- Element Drag/Resize/Rotate mouse handlers ---
  const startDragInteraction = (
    e: React.MouseEvent, 
    pageId: string, 
    el: DocElement, 
    mode: 'drag' | 'resize' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElId(el.id);
    setActivePageId(pageId);

    const pageEl = document.getElementById(`doc-page-${pageId}`);
    const rect = pageEl?.getBoundingClientRect();
    const pageWidth = rect?.width || PAGE_WIDTH_PX;
    const pageHeight = rect?.height || PAGE_HEIGHT_PX;

    setDragState({
      id: el.id,
      pageId,
      startX: e.clientX,
      startY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startWidth: el.width,
      startHeight: el.height,
      startRotate: el.rotate,
      mode,
      pageWidth,
      pageHeight
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      setPages(prev => prev.map(p => {
        if (p.id !== dragState.pageId) return p;
        return {
          ...p,
          elements: p.elements.map(el => {
            if (el.id !== dragState.id) return el;
            
            if (dragState.mode === 'drag') {
              const pctX = (dx / dragState.pageWidth) * 100;
              const pctY = (dy / dragState.pageHeight) * 100;
              return {
                ...el,
                x: Math.min(95, Math.max(-50, dragState.startElX + pctX)),
                y: Math.min(95, Math.max(-50, dragState.startElY + pctY))
              };
            } 
            else if (dragState.mode === 'resize') {
              const pctW = (dx / dragState.pageWidth) * 100;
              const pctH = (dy / dragState.pageHeight) * 100;
              return {
                ...el,
                width: Math.min(100, Math.max(5, dragState.startWidth + pctW)),
                height: Math.min(100, Math.max(4, dragState.startHeight + pctH))
              };
            } 
            else if (dragState.mode === 'rotate') {
              const elEl = document.getElementById(`element-${el.id}`);
              if (!elEl) return el;
              const rect = elEl.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              
              const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
              let angleDeg = (angleRad * 180) / Math.PI + 90; // offset so handle top is 0
              if (angleDeg < 0) angleDeg += 360;
              
              return { ...el, rotate: Math.round(angleDeg) };
            }
            return el;
          })
        };
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  // --- Background Remover Canvas processing logic ---
  const applyBackgroundRemoval = useCallback(() => {
    if (!bgRemoverImg || !selectedBgColor || !bgRemoverCanvasRef.current || !bgRemoverImageRef.current) return;

    const canvas = bgRemoverCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = bgRemoverImageRef.current;

    if (!ctx) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const { r: bgR, g: bgG, b: bgB } = selectedBgColor;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - bgR, 2) +
        Math.pow(g - bgG, 2) +
        Math.pow(b - bgB, 2)
      );

      if (distance <= tolerance) {
        data[i + 3] = 0; // Transparent
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const processedBase64 = canvas.toDataURL('image/png');

    updateElement(bgRemoverImg.id, { src: processedBase64 });
    setBgRemoverImg(null);
    setSelectedBgColor(null);
  }, [bgRemoverImg, selectedBgColor, tolerance]);

  const handleBgRemoverCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = bgRemoverCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setSelectedBgColor({
      r: pixel[0],
      g: pixel[1],
      b: pixel[2]
    });
  };

  // Load canvas preview image when opened
  useEffect(() => {
    if (bgRemoverImg && bgRemoverCanvasRef.current && bgRemoverImageRef.current) {
      const canvas = bgRemoverCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = bgRemoverImageRef.current;
      
      const draw = () => {
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };

      if (img.complete) draw();
      else img.onload = draw;
    }
  }, [bgRemoverImg]);

  // Real-time canvas preview tolerance updates
  useEffect(() => {
    if (bgRemoverImg && selectedBgColor && bgRemoverCanvasRef.current && bgRemoverImageRef.current) {
      const canvas = bgRemoverCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = bgRemoverImageRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const { r: bgR, g: bgG, b: bgB } = selectedBgColor;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const distance = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
          if (distance <= tolerance) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }, [tolerance, selectedBgColor, bgRemoverImg]);

  // --- PDF export using html2canvas for reliable DOM-to-canvas rendering ---
  const handleExportPdf = async () => {
    setExporting('pdf');
    setProgress(10);

    try {
      const [{ PDFDocument }, html2canvas] = await Promise.all([
        import('pdf-lib'),
        import('html2canvas').then(m => m.default),
      ]);

      const pdfDoc = await PDFDocument.create();
      setProgress(25);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        const pageEl = document.getElementById(`doc-page-${page.id}`);
        if (!pageEl) continue;

        // Temporarily hide all editing UI elements
        const noPrintEls = pageEl.querySelectorAll<HTMLElement>('.no-print');
        const elementOverlays = pageEl.querySelectorAll<HTMLElement>('[id^="element-"]');

        noPrintEls.forEach(el => { el.style.display = 'none'; });
        elementOverlays.forEach(el => {
          el.style.border = 'none';
          el.style.outline = 'none';
        });

        // Use html2canvas to render the live DOM element directly to a canvas
        const canvas = await html2canvas(pageEl as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          logging: false,
        } as any);

        // Restore editing UI elements
        noPrintEls.forEach(el => { el.style.display = ''; });
        elementOverlays.forEach(el => {
          el.style.border = '';
          el.style.outline = '';
        });

        // Encode canvas as lossless PNG
        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBase64 = pngDataUrl.split(',')[1];
        const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));

        // A4 page at 72dpi standard: 595 x 842 points
        const pdfPage = pdfDoc.addPage([595, 842]);
        const embeddedImg = await pdfDoc.embedPng(pngBytes);
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: 595,
          height: 842
        });

        setProgress(Math.round(25 + ((i + 1) / pages.length) * 65));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doccraft-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setExporting('success');
      setTimeout(() => setExporting('idle'), 3000);
    } catch (e) {
      console.error('PDF export error:', e);
      setExporting('idle');
    }
  };



  // --- HTML structured parsing elements for DOCX export ---
  const parseHtmlToDocxElements = (html: string, AlignmentType: any, Paragraph: any, TextRun: any) => {
    if (typeof window === 'undefined') return [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '<p></p>', 'text/html');
    const children: any[] = [];

    const extractTextRuns = (element: HTMLElement): any[] => {
      const runs: any[] = [];
      const walk = (node: Node, styles: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string }) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent) {
            runs.push(new TextRun({
              text: node.textContent,
              bold: styles.bold || undefined,
              italics: styles.italic || undefined,
              underline: styles.underline ? {} : undefined,
              color: styles.color || undefined,
            }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          const nextStyles = { ...styles };

          if (tagName === 'b' || tagName === 'strong' || el.style.fontWeight === 'bold') {
            nextStyles.bold = true;
          }
          if (tagName === 'i' || tagName === 'em' || el.style.fontStyle === 'italic') {
            nextStyles.italic = true;
          }
          if (tagName === 'u' || el.style.textDecoration.includes('underline')) {
            nextStyles.underline = true;
          }
          if (el.style.color) {
            let hex = el.style.color.replace('#', '');
            if (hex.startsWith('rgb')) hex = '1a1a1a'; // fallback
            nextStyles.color = hex;
          }

          el.childNodes.forEach(child => walk(child, nextStyles));
        }
      };

      element.childNodes.forEach(child => walk(child, {}));
      return runs;
    };

    doc.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        let alignment = AlignmentType.LEFT;
        if (el.style.textAlign === 'center') alignment = AlignmentType.CENTER;
        if (el.style.textAlign === 'right') alignment = AlignmentType.RIGHT;

        const runs = extractTextRuns(el);

        if (tagName === 'h1') {
          children.push(new Paragraph({
            heading: 'Heading1',
            alignment,
            children: runs.length ? runs : [new TextRun(el.textContent || '')],
          }));
        } else if (tagName === 'h2') {
          children.push(new Paragraph({
            heading: 'Heading2',
            alignment,
            children: runs.length ? runs : [new TextRun(el.textContent || '')],
          }));
        } else if (tagName === 'ul') {
          el.querySelectorAll('li').forEach(li => {
            const liRuns = extractTextRuns(li);
            children.push(new Paragraph({
              bullet: { level: 0 },
              children: liRuns.length ? liRuns : [new TextRun(li.textContent || '')],
            }));
          });
        } else {
          children.push(new Paragraph({
            alignment,
            children: runs.length ? runs : [new TextRun(el.textContent || '')],
          }));
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        children.push(new Paragraph({
          children: [new TextRun(node.textContent)],
        }));
      }
    });

    if (children.length === 0) {
      children.push(new Paragraph({ text: '' }));
    }
    return children;
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    setProgress(15);

    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } = await import('docx');
      setProgress(35);

      const docSections: any[] = [];

      pages.forEach((page, pIdx) => {
        const children: any[] = [];

        if (pIdx > 0) {
          // Page break
          children.push(new Paragraph({ text: '', pageBreakBefore: true }));
        }

        // 1. Text flow compilation
        const textElements = parseHtmlToDocxElements(page.textHtml, AlignmentType, Paragraph, TextRun);
        children.push(...textElements);

        // 2. Append Floating Images & Stickers sequentially
        const sortedGraphics = [...page.elements].sort((a, b) => a.y - b.y);
        
        sortedGraphics.forEach((el) => {
          if (el.type === 'image') {
            const img = el as ImageElement;
            const base64 = img.src.split(',')[1];
            if (base64) {
              const docxWidth = Math.round((img.width / 100) * 480);
              const docxHeight = Math.round((img.height / 100) * 640);
              children.push(
                new Paragraph({ text: '' }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: base64,
                      transformation: { width: docxWidth, height: docxHeight },
                      type: 'png'
                    } as any)
                  ]
                }),
                new Paragraph({ text: '' })
              );
            }
          } 
          else if (el.type === 'sticker') {
            const stk = el as StickerElement;
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: stk.stickerType,
                    size: 36
                  })
                ]
              })
            );
          }
        });

        docSections.push({
          properties: {},
          children
        });
      });

      setProgress(75);

      const doc = new Document({
        sections: docSections
      });

      const blob = await Packer.toBlob(doc);
      setProgress(95);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doc-docx-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setExporting('success');
      setTimeout(() => setExporting('idle'), 3000);
    } catch (e) {
      console.error(e);
      setExporting('idle');
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[#050505] text-white">
      {/* Dynamic Inline Editor Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wordmaker-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.3em;
          color: #111;
        }
        .wordmaker-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.3em;
          color: #222;
        }
        .wordmaker-editor p {
          font-size: 1em;
          margin-bottom: 0.6em;
          color: #333;
        }
        .wordmaker-editor ul {
          list-style-type: disc;
          margin-left: 1.5em;
          margin-bottom: 0.6em;
        }
        .wordmaker-editor ol {
          list-style-type: decimal;
          margin-left: 1.5em;
          margin-bottom: 0.6em;
        }
        .wordmaker-editor li {
          margin-bottom: 0.2em;
        }
      `}} />

      {/* Main Top Header Navbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 shrink-0 bg-[#080808]/90 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3366] to-[#FF80AC] flex items-center justify-center shadow-lg shadow-[#FF3366]/20">
            <Sparkles size={16} className="text-black" />
          </div>
          <span className="text-sm font-semibold text-white/90 font-mono-aerox tracking-wider">DocCraft Studio</span>
        </div>

        {/* Dynamic Rich Text Formatting Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
            {/* Font Selection Dropdown */}
            <select 
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs font-medium text-white/80 pr-2 max-w-[125px] cursor-pointer"
              defaultValue={FONTS[0].value}
              title="Font Family"
            >
              {FONTS.map(f => (
                <option key={f.name} value={f.value} className="bg-[#121212]">{f.name}</option>
              ))}
            </select>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Font Size Selector */}
            <select 
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="bg-transparent border-0 outline-none text-xs font-medium text-white/80 pr-1 max-w-[65px] cursor-pointer"
              defaultValue={16}
              title="Font Size"
            >
              {SIZES.map(sz => (
                <option key={sz} value={sz} className="bg-[#121212]">{sz}px</option>
              ))}
            </select>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Typographic Formatting Buttons */}
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Underline"
            >
              <Underline size={13} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Alignments */}
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyRight'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Heading Formatting Block toggles */}
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('formatBlock', '<h1>'); }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
              title="Heading 1"
            >
              H1
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('formatBlock', '<h2>'); }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
              title="Heading 2"
            >
              H2
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('formatBlock', '<p>'); }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
              title="Paragraph"
            >
              P
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Bullet List"
            >
              <List size={13} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Colors */}
            <div className="flex items-center gap-1">
              {CURATED_COLORS.map(c => (
                <button
                  key={c.name}
                  onMouseDown={(e) => { e.preventDefault(); handleFormat('foreColor', c.value); }}
                  className="w-3.5 h-3.5 rounded-full border border-white/20 transition-transform hover:scale-110 active:scale-90"
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <input 
                type="color" 
                onChange={(e) => handleFormat('foreColor', e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                title="Custom Color"
              />
            </div>
          </div>
        </div>

        {/* Export Controllers */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPdf}
            disabled={exporting !== 'idle'}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF3366] hover:bg-[#FF3366]/90 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-[#FF3366]/10"
          >
            <Download size={14} />
            Export PDF
          </button>
          <button 
            onClick={handleExportDocx}
            disabled={exporting !== 'idle'}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10"
          >
            <Layers size={14} />
            Export Word
          </button>
        </div>
      </div>

      {/* Editor Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar control drawer */}
        <div className="w-64 border-r border-white/10 bg-[#080808] flex flex-col p-4 shrink-0 overflow-y-auto z-10">
          <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-4 uppercase">Insert Media</p>

          <div className="flex flex-col gap-2.5 mb-6">
            <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all text-sm font-medium text-left cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ImageIcon size={15} />
              </div>
              <span>Upload Image</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </label>
          </div>

          <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-3 uppercase">Emoji Stickers</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {STICKERS.map(s => (
              <button 
                key={s.label}
                onClick={() => addSticker(s.char)}
                className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95"
                title={s.label}
              >
                {s.char}
              </button>
            ))}
          </div>

          {/* Floating graphic styling panel */}
          {selectedEl && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4 animate-in fade-in duration-200">
              <p className="text-[10px] font-semibold text-white/30 tracking-wider uppercase">Graphic Settings</p>
              
              {selectedEl.type === 'image' && (
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => setBgRemoverImg(selectedEl as ImageElement)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#FF3366] to-[#FF80AC] hover:opacity-90 text-black text-xs font-semibold rounded-xl transition-all"
                  >
                    <Sparkles size={13} />
                    Background Remover
                  </button>
                  {/* Restore BG */}
                  {(selectedEl as ImageElement).originalSrc && (selectedEl as ImageElement).src !== (selectedEl as ImageElement).originalSrc && (
                    <button 
                      onClick={() => updateElement(selectedEl.id, { src: (selectedEl as ImageElement).originalSrc })}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium rounded-xl transition-colors"
                    >
                      <Undo2 size={13} />
                      Restore Original
                    </button>
                  )}
                </div>
              )}

              {/* Rotate and Layering sliders */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Rotate Angle</span>
                  <span className="text-white/80 font-mono">{selectedEl.rotate}°</span>
                </div>
                <input 
                  type="range"
                  min={0}
                  max={360}
                  value={selectedEl.rotate}
                  onChange={(e) => updateElement(selectedEl.id, { rotate: Number(e.target.value) })}
                  className="w-full h-1 bg-white/10 accent-[#FF3366] cursor-pointer"
                />
              </div>

              <button 
                onClick={() => deleteElement(selectedEl.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 size={13} /> Delete Graphic
              </button>
            </div>
          )}

          {/* Page controls */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-3 uppercase">Document Pages</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={addPage}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#FF3366]/20 bg-[#FF3366]/5 text-[#FF3366] hover:bg-[#FF3366]/10 transition-colors text-xs font-semibold"
              >
                <Plus size={14} /> Add New Page
              </button>
            </div>
          </div>
        </div>

        {/* Center Canvas Workspace Area — Vertical scrolling stacked page list */}
        <div 
          onClick={() => setSelectedElId(null)}
          className="flex-1 bg-[#0c0c0c] overflow-y-auto p-12 flex flex-col items-center gap-12 relative"
        >
          {pages.map((page, idx) => {
            const isActive = activePageId === page.id;
            
            return (
              <div 
                key={page.id}
                id={`doc-page-${page.id}`}
                onClick={(e) => { e.stopPropagation(); setActivePageId(page.id); }}
                className="relative bg-white text-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex-shrink-0 transition-all duration-300"
                style={{ 
                  width: `${PAGE_WIDTH_PX}px`, 
                  height: `${PAGE_HEIGHT_PX}px`,
                  outline: isActive ? '2px solid #FF3366' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isActive ? '0 20px 50px rgba(255, 51, 102, 0.15)' : undefined
                }}
              >
                {/* Typing Editor Workspace container */}
                <div 
                  id={`page-text-${page.id}`}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => setActivePageId(page.id)}
                  onBlur={(e) => updatePageText(page.id, e.currentTarget.innerHTML)}
                  className="wordmaker-editor absolute inset-0 p-16 overflow-hidden outline-none text-left select-text"
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '16px',
                    color: '#1a1a1a',
                    lineHeight: '1.6',
                    backgroundColor: 'transparent',
                  }}
                  dangerouslySetInnerHTML={{ __html: page.textHtml }}
                />

                {/* Floating Graphical Overlay Layer */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {page.elements.map((el) => {
                    const isSelected = selectedElId === el.id;

                    return (
                      <div
                        key={el.id}
                        id={`element-${el.id}`}
                        style={{
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.width}%`,
                          height: `${el.height}%`,
                          transform: `rotate(${el.rotate}deg)`,
                          border: isSelected ? '2px solid #FF3366' : '1px dashed rgba(0,0,0,0.15)',
                          zIndex: isSelected ? 30 : 20,
                          cursor: 'move',
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={(e) => startDragInteraction(e, page.id, el, 'drag')}
                        className="group relative flex flex-col items-center justify-center"
                      >
                        {/* Resize indicator handle */}
                        {isSelected && (
                          <div 
                            onMouseDown={(e) => startDragInteraction(e, page.id, el, 'resize')}
                            className="no-print absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#FF3366] rounded-full border border-white cursor-se-resize flex items-center justify-center shadow-lg active:scale-90"
                            title="Resize"
                          />
                        )}

                        {/* Rotation handle */}
                        {isSelected && (
                          <div 
                            onMouseDown={(e) => startDragInteraction(e, page.id, el, 'rotate')}
                            className="no-print absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FF3366] border border-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95 hover:scale-105"
                            title="Rotate"
                          >
                            <RefreshCw size={9} className="text-white" />
                          </div>
                        )}

                        {/* Element content renders */}
                        <div className="w-full h-full overflow-hidden flex items-center justify-center p-0.5">
                          {el.type === 'image' && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={(el as ImageElement).src} 
                              alt={(el as ImageElement).name} 
                              className="w-full h-full object-contain pointer-events-none select-none" 
                            />
                          )}
                          {el.type === 'sticker' && (
                            <div className="text-4xl select-none pointer-events-none leading-none">
                              {(el as StickerElement).stickerType}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Page deletion and numbering controls */}
                <div className="no-print absolute -top-6 left-0 right-0 flex justify-between items-center px-1 pointer-events-auto">
                  <span className="text-[10px] text-white/40 font-mono-aerox uppercase tracking-wider">Page {idx + 1} of {pages.length}</span>
                  {pages.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                      className="p-1 text-white/30 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded transition-all text-[10px] flex items-center gap-1.5"
                    >
                      <Trash2 size={11} /> Delete Sheet
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Page workspace shortcut */}
          <button
            onClick={addPage}
            className="no-print flex items-center gap-2 px-5 py-3 rounded-2xl border border-dashed border-white/20 hover:border-[#FF3366] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-semibold shadow-lg hover:scale-105"
          >
            <Plus size={15} /> Insert Next Sheet
          </button>
        </div>

      </div>

      {/* Chroma Background removal Overlay Modal */}
      <AnimatePresence>
        {bgRemoverImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <div className="glass-dark max-w-2xl w-full rounded-3xl border border-white/10 p-6 flex flex-col shadow-2xl relative overflow-hidden">
              
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Sparkles size={16} className="text-[#FF3366]" />
                    Chroma Background Remover
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">Click anywhere on the image to key out that background color.</p>
                </div>
                <button 
                  onClick={() => { setBgRemoverImg(null); setSelectedBgColor(null); }}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-5 items-center justify-center my-2">
                
                {/* Canvas workbox */}
                <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 8 8%22><rect width=%224%22 height=%224%22 fill=%22%23222%22/><rect x=%224%22 y=%224%22 width=%224%22 height=%224%22 fill=%22%23222%22/><rect x=%224%22 width=%224%22 height=%224%22 fill=%22%23111%22/><rect y=%224%22 width=%224%22 height=%224%22 fill=%22%23111%22/></svg>')] shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    ref={bgRemoverImageRef}
                    src={bgRemoverImg.originalSrc || bgRemoverImg.src} 
                    alt="Source" 
                    className="hidden" 
                  />
                  <canvas 
                    ref={bgRemoverCanvasRef}
                    width={380}
                    height={280}
                    onClick={handleBgRemoverCanvasClick}
                    className="block cursor-crosshair max-w-full"
                  />
                </div>

                <div className="flex-1 w-full flex flex-col gap-4">
                  {/* Color Key box */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-xs text-white/40">Target Color Key</span>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-md animate-in zoom-in duration-300"
                        style={{ 
                          backgroundColor: selectedBgColor 
                            ? `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})` 
                            : 'transparent' 
                        }}
                      />
                      <span className="text-xs font-mono text-white/70">
                        {selectedBgColor 
                          ? `RGB(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})` 
                          : 'Click image color to select'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Tolerance slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50">Chroma Tolerance</span>
                      <span className="font-semibold text-[#FF3366] font-mono">{tolerance}</span>
                    </div>
                    <input 
                      type="range"
                      min={5}
                      max={120}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full bg-white/10 accent-[#FF3366] cursor-pointer"
                    />
                  </div>

                  <div className="text-[11px] text-white/30 flex items-center gap-1.5 leading-relaxed bg-[#FF3366]/5 border border-[#FF3366]/10 p-3 rounded-xl">
                    <ShieldCheck size={14} className="text-[#FF3366] shrink-0" />
                    <span>Processed entirely locally. Original file remains safe.</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 border-t border-white/5 pt-4">
                <button 
                  onClick={() => { setBgRemoverImg(null); setSelectedBgColor(null); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={applyBackgroundRemoval}
                  disabled={!selectedBgColor}
                  className="px-5 py-2 bg-gradient-to-r from-[#FF3366] to-[#FF80AC] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl text-xs font-semibold transition-all shadow-md"
                >
                  Apply Cutout
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assembly/Success progress modal overlay */}
      <AnimatePresence>
        {exporting !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <div className="glass-dark border border-white/10 max-w-sm w-full p-8 rounded-3xl flex flex-col items-center justify-center gap-5 text-center">
              {exporting === 'success' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base">Export Successful</h3>
                    <p className="text-white/40 text-xs mt-1">Check your browser downloads for the saved file.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-16 h-16">
                    <motion.div 
                      className="absolute inset-0 rounded-full border-2 border-white/10"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    />
                    <motion.div 
                      className="absolute inset-1 w-14 h-14 rounded-full border-2 border-t-[#FF3366] border-r-[#FF80AC] border-b-transparent border-l-transparent"
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-[#FF3366]">{progress}%</div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base">Assembling Document</h3>
                    <p className="text-white/40 text-xs mt-1">Generating your native document layout client-side...</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
