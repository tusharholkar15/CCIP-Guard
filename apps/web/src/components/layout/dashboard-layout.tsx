'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="h-screen w-screen bg-bg-primary flex overflow-hidden text-text-primary selection:bg-status-info/30 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-bg-primary">
          <div className="max-w-[1800px] mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
