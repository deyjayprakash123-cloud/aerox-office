<div align="center">

<br/>

```
 █████╗ ███████╗██████╗  ██████╗ ██╗  ██╗     ██████╗ ███████╗███████╗██╗ ██████╗███████╗
██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝    ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██╔════╝
███████║█████╗  ██████╔╝██║   ██║ ╚███╔╝     ██║   ██║█████╗  █████╗  ██║██║     █████╗  
██╔══██║██╔══╝  ██╔══██╗██║   ██║ ██╔██╗     ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██╔══╝  
██║  ██║███████╗██║  ██║╚██████╔╝██╔╝ ██╗    ╚██████╔╝██║     ██║     ██║╚██████╗███████╗
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚══════╝
```

### **The All-in-One Productivity Suite — Entirely Free. Forever.**

*Compress. Convert. Create. — No accounts, no subscriptions, no limits.*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_LIVE_DEMO-aerox--office.vercel.app-00ffc2?style=for-the-badge&labelColor=000000)](https://aerox-office.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-white?style=for-the-badge&logo=nextdotjs&labelColor=000000)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&labelColor=000000)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-white?style=for-the-badge&logo=vercel&labelColor=000000)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=000000)](LICENSE)

<br/>

</div>

---

## ✦ What is Aerox Office?

**Aerox Office** is a blazing-fast, browser-based productivity suite that replaces a dozen separate tools with a single, elegant workspace. Built for creators, developers, students, and professionals who value their time — and their privacy.

> **Zero sign-up. Zero cost. Zero data uploaded to servers.**  
> Everything runs directly in your browser.

---

## ⚡ Features

### 📄 Document Creator (`WordMaker`)
> A full-featured rich-text document editor, right in your browser.

- Bold, Italic, Underline, Strikethrough formatting
- Headings (H1 → H3), Blockquotes, Code blocks
- Ordered & unordered lists
- Font size & color controls
- Export directly to **`.docx`** format (Microsoft Word compatible)
- Clean, distraction-free writing interface

---

### 📊 Spreadsheet Engine
> A powerful spreadsheet powered by formula computation — think Excel, but free and instant.

- Full grid editing with **HyperFormula** formula engine
- Support for standard formulas (`SUM`, `AVERAGE`, `IF`, `VLOOKUP`, and more)
- Drag-to-sort columns via **@dnd-kit**
- Virtualized rendering for massive datasets using **react-window**
- Import & Export to **`.xlsx`** (Excel-compatible)
- Built-in **Recharts** data visualization — generate charts from your data
- Smooth, responsive UI with zero lag

---

### 🔄 File Converter (`ProConverter`)
> Convert between popular file formats without uploading anything to the cloud.

- **Image Conversion**: PNG ↔ JPG ↔ WebP ↔ BMP ↔ GIF
- **PDF to Image**: Extract PDF pages as high-quality images
- **Image to PDF**: Combine images into a single PDF document
- Batch conversion support
- Preview before converting
- All processing done **100% client-side**

---

### 🗜️ File Compressor
> Reduce file sizes without sacrificing quality.

- Smart image compression with configurable quality levels
- Real-time before/after size comparison
- Drag & drop interface
- Instant download — no waiting, no uploading

---

### 📑 PDF Creator (`PdfMaker`)
> Build polished PDF documents from scratch or from existing content.

- Rich text input with layout controls
- Powered by **pdf-lib** for precise PDF generation
- Export as ready-to-share `.pdf` files
- Supports custom page sizing and margins

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **3D / Visual** | [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei) |
| **Spreadsheet Engine** | [HyperFormula](https://hyperformula.handsontable.com/) |
| **Table Rendering** | [@tanstack/react-table](https://tanstack.com/table/) |
| **Virtual Scrolling** | [react-window](https://react-window.vercel.app/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **PDF Engine** | [pdf-lib](https://pdf-lib.js.org/) + [pdfjs-dist](https://mozilla.github.io/pdf.js/) |
| **Word Export** | [docx](https://docx.js.org/) |
| **Excel I/O** | [xlsx (SheetJS)](https://sheetjs.com/) |
| **Canvas Capture** | [html2canvas](https://html2canvas.hertzen.com/) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 18.x`
- **npm** or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/deyjayprakash123-cloud/aerox-office.git

# 2. Navigate into the project
cd aerox-office

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's it — you're running Aerox Office locally.

---

## 📦 Build for Production

```bash
# Create an optimized production build
npm run build

# Start the production server
npm start
```

---

## 🌐 Live Deployment

Aerox Office is deployed and accessible at:

> **[https://aerox-office.vercel.app/](https://aerox-office.vercel.app/)**

Hosted on **Vercel** with global CDN — zero cold-start, instant worldwide access.

---

## 🔒 Privacy First

Aerox Office is built with a **privacy-by-design** philosophy:

- ✅ **No file uploads** — all processing happens in your browser
- ✅ **No accounts required** — open and use immediately
- ✅ **No tracking or analytics** on your documents
- ✅ **No subscriptions** — free today, free forever

---

## 📁 Project Structure

```
aerox-office/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout & metadata
│   │   ├── page.tsx           # Main workspace entry point
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── converter/
│   │   │   ├── FileCompressor.tsx   # File compression tool
│   │   │   ├── LandingConverter.tsx # Conversion landing UI
│   │   │   ├── PdfMaker.tsx         # PDF creation tool
│   │   │   └── ProConverter.tsx     # Advanced file converter
│   │   ├── spreadsheet/
│   │   │   └── SpreadsheetGrid.tsx  # Full spreadsheet engine
│   │   ├── wordmaker/
│   │   │   └── WordMaker.tsx        # Document editor
│   │   ├── BackgroundAether.tsx     # Animated background
│   │   ├── Dock.tsx                 # App navigation dock
│   │   └── Workspace.tsx            # Workspace shell
│   ├── store/                       # Zustand state stores
│   └── workers/                     # Web Workers for heavy tasks
├── public/                          # Static assets
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👨‍💻 Author

**Deyjay Prakash**  
[![GitHub](https://img.shields.io/badge/GitHub-deyjayprakash123--cloud-181717?style=flat-square&logo=github)](https://github.com/deyjayprakash123-cloud)

---

## 📜 License

This project is licensed under the **MIT License** — use it, modify it, share it freely.

---

<div align="center">

**Built with ❤️ — because great tools should be free.**

⭐ *If Aerox Office helps you, consider starring the repo!* ⭐

</div>
