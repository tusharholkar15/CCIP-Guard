'use client';

import { motion } from 'framer-motion';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';
import {
  Database,
  Server,
  Globe,
  Cpu,
  BarChart3,
  Bell,
  Shield,
  Monitor,
  Radio,
  ChevronDown,
} from 'lucide-react';

const architectureLayers = [
  {
    label: 'Blockchain Networks',
    icon: Globe,
    tech: 'Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain',
    description: 'Production CCIP source and destination chains',
    color: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/30',
  },
  {
    label: 'CCIP Event Indexer',
    icon: Radio,
    tech: 'viem, TypeScript',
    description: 'Watches blockchain events and correlates cross-chain messages',
    color: 'from-cyan-500/20 to-cyan-500/5',
    borderColor: 'border-cyan-500/30',
  },
  {
    label: 'Redis Event Bus',
    icon: Cpu,
    tech: 'Redis, BullMQ',
    description: 'Distributes events to workers for processing',
    color: 'from-red-500/20 to-red-500/5',
    borderColor: 'border-red-500/30',
  },
  {
    label: 'Workers',
    icon: BarChart3,
    tech: 'Metrics Worker, Alert Worker, Response Worker',
    description: 'Process metrics, detect incidents, manage responses',
    color: 'from-amber-500/20 to-amber-500/5',
    borderColor: 'border-amber-500/30',
  },
  {
    label: 'PostgreSQL',
    icon: Database,
    tech: 'Drizzle ORM',
    description: 'Persistent storage for messages, incidents, alerts, and audit logs',
    color: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/30',
  },
  {
    label: 'Fastify API',
    icon: Server,
    tech: 'Fastify, WebSocket, Prometheus',
    description: 'REST API and real-time WebSocket for the dashboard',
    color: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
  },
  {
    label: 'BridgeGuard Dashboard',
    icon: Monitor,
    tech: 'Next.js, React, TailwindCSS',
    description: 'Security operations dashboard with real-time updates',
    color: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/30',
  },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicNavbar />

      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-status-info mb-3">SYSTEM ARCHITECTURE</p>
            <h1 className="text-4xl font-bold text-text-primary mb-4">How BridgeGuard works</h1>
            <p className="text-text-muted max-w-xl mx-auto">
              From blockchain events to actionable security intelligence — the complete data flow.
            </p>
          </motion.div>

          <div className="space-y-4">
            {architectureLayers.map((layer, i) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`p-6 rounded-lg border ${layer.borderColor} bg-gradient-to-r ${layer.color}`}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-surface-primary/50 flex items-center justify-center">
                      <layer.icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{layer.label}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{layer.description}</p>
                      <p className="text-xs font-mono text-text-muted/70 mt-1">{layer.tech}</p>
                    </div>
                  </div>
                </div>
                {i < architectureLayers.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ChevronDown className="h-5 w-5 text-text-muted/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
