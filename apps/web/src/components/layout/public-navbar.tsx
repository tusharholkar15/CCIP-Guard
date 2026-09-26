'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, ArrowRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '/#overview', label: 'Overview' },
  { href: '/#network', label: 'Network' },
  { href: '/#messages', label: 'Messages' },
  { href: '/#security', label: 'Security' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/docs', label: 'Docs' },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-bg-primary/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-status-info to-status-healthy flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-text-primary">BRIDGEGUARD</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/overview"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-status-info/20 to-status-healthy/20 text-status-info hover:from-status-info/30 hover:to-status-healthy/30 border border-status-info/20 transition-all"
            >
              Launch Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-text-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-bg-secondary"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/overview"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-status-info"
              >
                Launch Dashboard →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
