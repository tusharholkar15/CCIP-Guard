'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Activity,
  MessageSquare,
  Network,
  AlertTriangle,
  FileText,
  Link2,
  ChevronRight,
  Globe,
  Zap,
  Eye,
  Lock,
  Search,
  CheckCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';

const ThreeBackground = dynamic(
  () => import('@/components/background/three-background').then((mod) => mod.ThreeBackground),
  { ssr: false }
);

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: MessageSquare,
    title: 'MESSAGE INTELLIGENCE',
    description: 'Track cross-chain messages from initiation through execution with complete visibility.',
  },
  {
    icon: Link2,
    title: 'LIFECYCLE CORRELATION',
    description: 'Correlate source-chain events with destination-chain execution automatically.',
  },
  {
    icon: Network,
    title: 'NETWORK MONITORING',
    description: 'Observe chain and lane health with real-time status and latency metrics.',
  },
  {
    icon: AlertTriangle,
    title: 'INCIDENT DETECTION',
    description: 'Detect high latency, delivery failure spikes, and message backlogs.',
  },
  {
    icon: Shield,
    title: 'CONTROLLED RESPONSE',
    description: 'Generate response proposals requiring explicit operator approval before action.',
  },
  {
    icon: FileText,
    title: 'AUDITABILITY',
    description: 'Maintain complete operational history of all security actions and decisions.',
  },
];

const lifecycleStates = [
  { label: 'SENT', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { label: 'PROCESSING', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { label: 'SUCCESS', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
];

const securityPipeline = [
  { label: 'Telemetry', icon: Activity },
  { label: 'Detection', icon: Search },
  { label: 'Incident', icon: AlertTriangle },
  { label: 'Investigation', icon: Eye },
  { label: 'Response', icon: Shield },
  { label: 'Approval', icon: Lock },
  { label: 'Audit', icon: FileText },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden font-sans">
      {/* 3D Web3 Infrastructure Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <ThreeBackground />
        {/* Subtle dark gradient overlay for optimal text contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/70 via-bg-primary/50 to-bg-primary/85 pointer-events-none" />
        {/* Radial vignette for central focal emphasis */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#05070A_85%)] pointer-events-none" />
      </div>

      {/* Existing Foreground Content */}
      <div className="relative z-10">
        <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-status-info/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <motion.p
              variants={fadeInUp}
              className="text-xs font-mono font-bold tracking-[0.2em] text-status-info mb-6 uppercase"
            >
              CCIP OBSERVABILITY PLATFORM
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6"
            >
              Security observability for{' '}
              <span className="text-gradient">cross-chain infrastructure</span>.
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto"
            >
              BridgeGuard provides real-time visibility into cross-chain message lifecycles,
              network health, incidents, and controlled response operations.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/overview"
                className="flex items-center gap-3 px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest rounded-sm bg-gradient-to-r from-status-info to-status-healthy text-white hover:opacity-90 transition-opacity"
              >
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/architecture"
                className="flex items-center gap-3 px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-primary transition-colors"
              >
                Explore Architecture
              </Link>
            </motion.div>
          </motion.div>

          {/* Network Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-16 max-w-3xl mx-auto"
          >
            <svg viewBox="0 0 600 200" className="w-full" aria-label="Network topology visualization">
              {/* Ethereum Node */}
              <g>
                <rect x="40" y="60" width="180" height="80" rx="4" fill="#05070A" stroke="#202A36" strokeWidth="1" />
                <circle cx="70" cy="100" r="16" fill="#38BDF8" fillOpacity="0.1" stroke="#38BDF8" strokeWidth="1" />
                <text x="70" y="105" textAnchor="middle" fill="#38BDF8" fontSize="12" fontWeight="bold">E</text>
                <text x="140" y="95" textAnchor="middle" fill="#F5F7FA" fontSize="12" fontWeight="500">Ethereum</text>
                <text x="140" y="112" textAnchor="middle" fill="#596575" fontSize="10">Chain 1</text>
              </g>
              {/* Arbitrum Node */}
              <g>
                <rect x="380" y="60" width="180" height="80" rx="4" fill="#05070A" stroke="#202A36" strokeWidth="1" />
                <circle cx="410" cy="100" r="16" fill="#22C55E" fillOpacity="0.1" stroke="#22C55E" strokeWidth="1" />
                <text x="410" y="105" textAnchor="middle" fill="#22C55E" fontSize="12" fontWeight="bold">A</text>
                <text x="480" y="95" textAnchor="middle" fill="#F5F7FA" fontSize="12" fontWeight="500">Arbitrum</text>
                <text x="480" y="112" textAnchor="middle" fill="#596575" fontSize="10">Chain 42161</text>
              </g>
              {/* CCIP Lane */}
              <line x1="220" y1="100" x2="380" y2="100" stroke="#202A36" strokeWidth="2" strokeDasharray="4 4" />
              <text x="300" y="88" textAnchor="middle" fill="#596575" fontSize="10" fontWeight="500">CCIP LANE</text>
              {/* Animated dot removed to prevent fake traffic animation */}
              <path id="lanePath" d="M 220 100 L 380 100" fill="none" />
            </svg>
          </motion.div>

          {/* Hero Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { label: 'Networks', value: '--' },
              { label: 'Messages', value: '--' },
              { label: 'Success Rate', value: '--' },
              { label: 'Incidents', value: '--' },
            ].map((metric) => (
              <div key={metric.label} className="text-center p-6 rounded-sm border border-border/40 bg-surface-primary">
                <p className="text-xs font-mono font-bold text-text-muted uppercase tracking-widest mb-2">{metric.label}</p>
                <p className="text-3xl font-bold font-mono text-text-primary">{metric.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="overview" className="py-24 px-6 sm:px-8 border-t border-border/40 bg-bg-primary">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-status-info mb-4">CAPABILITIES</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Complete observability stack</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-colors"
              >
                <div className="h-12 w-12 rounded-sm bg-status-info/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-status-info" />
                </div>
                <h3 className="text-sm font-mono font-bold tracking-widest uppercase text-text-primary mb-3">{feature.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Message Lifecycle */}
      <section id="messages" className="py-24 px-6 sm:px-8 border-t border-border/40 bg-surface-primary">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-status-info mb-4">MESSAGE TRACKING</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Cross-chain message lifecycle</h2>
            <p className="text-text-muted mt-4 max-w-xl mx-auto">
              Track every message from source chain initiation through destination chain delivery.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0">
            {lifecycleStates.map((state, i) => (
              <motion.div
                key={state.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center"
              >
                <div className={`px-8 py-6 rounded-sm border ${state.borderColor} ${state.bgColor} text-center min-w-[200px]`}>
                  <p className={`text-sm font-bold tracking-widest ${state.color} font-mono`}>{state.label}</p>
                </div>
                {i < lifecycleStates.length - 1 && (
                  <ChevronRight className="h-6 w-6 text-text-muted mx-4 hidden md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Intelligence */}
      <section id="security" className="py-24 px-6 sm:px-8 border-t border-border/40 bg-bg-primary">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-status-info mb-4">SECURITY OPERATIONS</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">From telemetry to action</h2>
            <p className="text-text-muted mt-4 max-w-xl mx-auto">
              BridgeGuard converts raw blockchain telemetry into actionable security intelligence.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {securityPipeline.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center"
              >
                <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-sm border border-border/40 bg-surface-primary min-w-[120px]">
                  <step.icon className="h-6 w-6 text-status-info" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary">{step.label}</span>
                </div>
                {i < securityPipeline.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-text-muted mx-2" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Detection types */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { type: 'HIGH_LATENCY', description: 'Messages exceeding latency thresholds', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { type: 'DELIVERY_FAILURE_SPIKE', description: 'Abnormal increase in failed deliveries', color: 'text-red-400', bg: 'bg-red-500/10' },
              { type: 'MESSAGE_BACKLOG', description: 'Unprocessed messages exceeding threshold', color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map((detection) => (
              <div key={detection.type} className={`p-6 rounded-sm border border-border/40 ${detection.bg}`}>
                <p className={`text-xs font-bold tracking-widest font-mono uppercase ${detection.color} mb-2`}>{detection.type}</p>
                <p className="text-sm text-text-muted">{detection.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 sm:px-8 border-t border-border/40 bg-surface-primary">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">See the system in action</h2>
            <p className="text-text-muted mb-10 text-lg">
              Explore cross-chain telemetry, message lifecycles, incidents, and controlled response operations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/overview"
                className="flex items-center gap-3 px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest rounded-sm bg-gradient-to-r from-status-info to-status-healthy text-white hover:opacity-90 transition-opacity"
              >
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/architecture"
                className="flex items-center gap-3 px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-primary transition-colors"
              >
                View Architecture
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

        <PublicFooter />
      </div>
    </div>
  );
}
