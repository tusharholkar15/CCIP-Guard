'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Network,
  MessageSquare,
  Route,
  AlertTriangle,
  Bell,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const groups = [
  {
    label: 'MONITOR',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutDashboard },
      { href: '/network', label: 'Network', icon: Network },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/lanes', label: 'Lanes', icon: Route },
    ]
  },
  {
    label: 'SECURITY',
    items: [
      { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
      { href: '/alerts', label: 'Alerts', icon: Bell },
      { href: '/responses', label: 'Responses', icon: Shield },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { href: '/audit', label: 'Audit', icon: FileText },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border/40 bg-bg-primary h-full transition-all duration-300 relative z-20',
        collapsed ? 'w-[72px]' : 'w-72',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-border/40 shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-4 w-full">
            <div className="h-8 w-8 rounded-sm bg-surface-primary border border-border/40 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium tracking-wide text-text-primary">BRIDGEGUARD</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">Operations</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto h-8 w-8 rounded-sm bg-surface-primary border border-border/40 flex items-center justify-center shrink-0 group relative">
            <Shield className="h-4 w-4 text-text-primary" />
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface-primary text-text-primary text-xs font-mono rounded border border-border/40 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              BridgeGuard
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">
        {groups.map((group, i) => (
          <div key={i} className="space-y-3">
            {!collapsed && (
              <div className="px-3 text-[10px] font-mono text-text-muted uppercase tracking-widest mb-4">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-4 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative',
                      isActive
                        ? 'text-text-primary bg-surface-primary border border-border/40'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-primary/50 border border-transparent',
                      collapsed && 'justify-center'
                    )}
                  >
                    {isActive && (
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-4 bg-text-primary rounded-r-full" />
                    )}
                    <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-text-primary" : "")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                  {collapsed && (
                    <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface-primary text-text-primary text-xs font-mono rounded border border-border/40 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-border/40 space-y-4 shrink-0 bg-bg-primary">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-3 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-primary border border-transparent hover:border-border/40 transition-all"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
