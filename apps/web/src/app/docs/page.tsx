'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';
import {
  BookOpen,
  Network,
  MessageSquare,
  AlertTriangle,
  Bell,
  Shield,
  FileText,
  Server,
  Rocket,
  Link2,
  ChevronRight,
} from 'lucide-react';

const docSections = [
  { icon: Rocket, title: 'Getting Started', description: 'Set up BridgeGuard locally with Docker Compose', href: '#getting-started' },
  { icon: Server, title: 'Architecture', description: 'System design, data flow, and component overview', href: '/architecture' },
  { icon: Link2, title: 'Message Lifecycle', description: 'CCIP message states and correlation logic', href: '#lifecycle' },
  { icon: Network, title: 'Network Monitoring', description: 'Chain health, RPC monitoring, and lane status', href: '#network' },
  { icon: MessageSquare, title: 'Messages', description: 'Cross-chain message tracking and search', href: '#messages' },
  { icon: AlertTriangle, title: 'Incidents', description: 'Detection rules, severity levels, and management', href: '#incidents' },
  { icon: Bell, title: 'Alerts', description: 'Alert types, thresholds, and acknowledgement', href: '#alerts' },
  { icon: Shield, title: 'Responses', description: 'Controlled response proposals and execution modes', href: '#responses' },
  { icon: FileText, title: 'Audit', description: 'Audit logging, operator tracking, and compliance', href: '#audit' },
  { icon: Server, title: 'API Reference', description: 'REST API endpoints and WebSocket events', href: '#api' },
  { icon: Rocket, title: 'Deployment', description: 'Docker, environment configuration, and production', href: '#deployment' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicNavbar />

      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-status-info mb-3">DOCUMENTATION</p>
            <h1 className="text-4xl font-bold text-text-primary mb-4">BridgeGuard Documentation</h1>
            <p className="text-text-muted">Everything you need to deploy, configure, and operate BridgeGuard.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docSections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={section.href}
                  className="flex items-start gap-4 p-5 rounded-lg border border-border bg-surface-primary hover:bg-surface-secondary transition-colors group"
                >
                  <div className="shrink-0 h-9 w-9 rounded-lg bg-status-info/10 flex items-center justify-center">
                    <section.icon className="h-4 w-4 text-status-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-status-info transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">{section.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0 mt-1" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Getting Started */}
          <motion.div
            id="getting-started"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-text-primary mb-6">Getting Started</h2>
            <div className="p-6 rounded-lg border border-border bg-surface-primary">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Start with Docker</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-text-muted mb-2">1. Clone the repository</p>
                  <pre className="p-3 rounded bg-bg-primary font-mono text-xs text-text-secondary overflow-x-auto">
                    git clone https://github.com/your-org/bridgeguard.git && cd bridgeguard
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-2">2. Configure environment</p>
                  <pre className="p-3 rounded bg-bg-primary font-mono text-xs text-text-secondary overflow-x-auto">
                    cp .env.example .env
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-2">3. Start infrastructure</p>
                  <pre className="p-3 rounded bg-bg-primary font-mono text-xs text-text-secondary overflow-x-auto">
                    docker compose up -d
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-2">4. Install dependencies and start development</p>
                  <pre className="p-3 rounded bg-bg-primary font-mono text-xs text-text-secondary overflow-x-auto">
                    pnpm install && pnpm dev
                  </pre>
                </div>
              </div>
            </div>

            {/* API Reference */}
            <div id="api" className="mt-12">
              <h2 className="text-2xl font-bold text-text-primary mb-6">API Reference</h2>
              <div className="space-y-3">
                {[
                  { method: 'GET', path: '/api/dashboard/stats', description: 'Dashboard statistics' },
                  { method: 'GET', path: '/api/chains', description: 'List monitored chains' },
                  { method: 'GET', path: '/api/lanes', description: 'List CCIP lanes' },
                  { method: 'GET', path: '/api/messages', description: 'List messages (paginated, filterable)' },
                  { method: 'GET', path: '/api/messages/:id', description: 'Get message details' },
                  { method: 'GET', path: '/api/incidents', description: 'List incidents' },
                  { method: 'PATCH', path: '/api/incidents/:id', description: 'Update incident status' },
                  { method: 'GET', path: '/api/alerts', description: 'List alerts' },
                  { method: 'PATCH', path: '/api/alerts/:id', description: 'Update alert status' },
                  { method: 'GET', path: '/api/responses', description: 'List response proposals' },
                  { method: 'POST', path: '/api/responses', description: 'Create response proposal' },
                  { method: 'POST', path: '/api/responses/:id/approve', description: 'Approve proposal' },
                  { method: 'POST', path: '/api/responses/:id/reject', description: 'Reject proposal' },
                  { method: 'GET', path: '/api/audit', description: 'List audit logs' },
                  { method: 'GET', path: '/health', description: 'Health check' },
                  { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
                  { method: 'WS', path: '/ws', description: 'WebSocket real-time updates' },
                ].map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-surface-primary">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      endpoint.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' :
                      endpoint.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                      endpoint.method === 'PATCH' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-xs font-mono text-text-secondary">{endpoint.path}</code>
                    <span className="text-xs text-text-muted ml-auto">{endpoint.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
