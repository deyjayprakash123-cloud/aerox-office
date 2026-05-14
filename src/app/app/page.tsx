'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const BackgroundAether = dynamic(() => import('@/components/BackgroundAether'), { ssr: false });
const Workspace = dynamic(() => import('@/components/workspace/Workspace'), { ssr: false });
const Dock = dynamic(() => import('@/components/Dock'), { ssr: false });

export default function AppPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505]">
      <BackgroundAether />
      {mounted && (
        <>
          <Workspace />
          <Dock />
        </>
      )}
      {/* Top bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="flex items-center gap-3 px-5 py-2 glass rounded-full">
          <span className="font-mono-aerox text-gradient text-sm font-bold tracking-widest">AEROX OFFICE</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/30 text-xs font-mono-aerox">WORKSPACE</span>
        </div>
      </div>
    </div>
  );
}
