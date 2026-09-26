'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header({ title }: { title?: string }) {
  const pathname = usePathname();
  const [isLive, setIsLive] = useState(true);

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumb = segments.length > 0
    ? segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')
    : 'Overview';
    
  const displayTitle = title || breadcrumb;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive(prev => !prev);
      setTimeout(() => setIsLive(true), 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 px-8 border-b border-border/40 bg-bg-primary/95 backdrop-blur-sm flex flex-row items-center justify-between shrink-0 relative z-10">
      
      {/* Left side: Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <span className="text-text-muted text-sm font-mono uppercase tracking-wider hidden sm:inline-block">Trace /</span>
        <h1 className="text-sm font-semibold text-text-primary tracking-wide">{displayTitle}</h1>
      </div>

      {/* Right side: Badges and indicators */}
      <div className="flex flex-row items-center gap-4">


        {/* Live Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-primary border border-border/40">
          <div className="relative flex h-1.5 w-1.5">
            {isLive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-healthy opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-healthy"></span>
          </div>
          <span className="text-[10px] font-mono text-text-secondary uppercase">OPERATIONAL</span>
        </div>
      </div>
    </header>
  );
}
