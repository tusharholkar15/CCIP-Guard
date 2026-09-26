'use client';

import { motion } from 'framer-motion';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';
import { Shield, Eye, Lock, Activity, Database, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicNavbar />

      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold tracking-[0.2em] text-status-info mb-3">ABOUT</p>
            <h1 className="text-4xl font-bold text-text-primary mb-8">About BridgeGuard</h1>

            <div className="prose prose-invert max-w-none space-y-6">
              <div className="p-5 rounded-lg border border-border bg-surface-primary">
                <p className="text-sm text-text-secondary leading-relaxed">
                  BridgeGuard is an independent cross-chain security observability platform built around
                  blockchain infrastructure and Chainlink CCIP monitoring concepts. It provides real-time
                  visibility into cross-chain message lifecycles, network health, incidents, alerts, and
                  controlled response operations.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-xs text-amber-400 font-medium">
                  BridgeGuard is NOT an official Chainlink product. It is not owned, operated, or endorsed by Chainlink Labs.
                  It uses Chainlink CCIP terminology accurately for educational and monitoring purposes.
                </p>
              </div>

              <h2 className="text-xl font-bold text-text-primary pt-4">Why BridgeGuard exists</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Cross-chain bridges and messaging protocols are critical infrastructure. They require
                dedicated observability — the ability to see message state, detect anomalies, investigate
                incidents, and respond to threats with full auditability.
              </p>

              <h2 className="text-xl font-bold text-text-primary pt-4">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Globe, title: 'Event Indexing', desc: 'Watches blockchain networks for CCIP events and correlates cross-chain messages.' },
                  { icon: Activity, title: 'Metrics Processing', desc: 'Computes latency percentiles, throughput, and failure rates across time windows.' },
                  { icon: Eye, title: 'Incident Detection', desc: 'Applies detection rules for high latency, failure spikes, and message backlogs.' },
                  { icon: Shield, title: 'Controlled Response', desc: 'Generates response proposals requiring operator approval before any action.' },
                  { icon: Database, title: 'Audit Logging', desc: 'Records every security action and decision for compliance and review.' },
                  { icon: Lock, title: 'Security Model', desc: 'API key authentication, operator roles, and backend-validated authorization.' },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg border border-border bg-surface-primary">
                    <item.icon className="h-5 w-5 text-status-info mb-2" />
                    <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-bold text-text-primary pt-4">Technology</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Next.js', 'Fastify', 'PostgreSQL', 'Redis', 'viem', 'BullMQ', 'Prometheus', 'Docker'].map((tech) => (
                  <div key={tech} className="p-3 rounded-lg border border-border bg-surface-primary text-center">
                    <p className="text-xs font-mono text-text-secondary">{tech}</p>
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
