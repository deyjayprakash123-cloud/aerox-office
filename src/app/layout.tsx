import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AEROX OFFICE — Spatial Productivity Suite',
  description:
    'A High-Performance, Spatial Productivity Suite. Process 250+ page PDFs, build unlimited data grids, and visualize 3D graphs — all client-side, all private.',
  keywords: ['productivity', 'spreadsheet', 'PDF converter', 'data visualization', '3D graphs'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-[#050505] text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
