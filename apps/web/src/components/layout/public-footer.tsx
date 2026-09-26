import Link from 'next/link';
import { Shield } from 'lucide-react';

const footerLinks = [
  {
    title: 'Platform',
    links: [
      { href: '/overview', label: 'Overview' },
      { href: '/network', label: 'Network' },
      { href: '/messages', label: 'Messages' },
      { href: '/incidents', label: 'Incidents' },
      { href: '/responses', label: 'Responses' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/architecture', label: 'Architecture' },
      { href: '/docs', label: 'Documentation' },
      { href: '/about', label: 'About' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-status-info to-status-healthy flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-text-primary">BRIDGEGUARD</span>
            </div>
            <p className="text-sm text-text-muted max-w-sm mb-4">
              Cross-chain security observability. Real-time visibility into message lifecycles, network health, incidents, and controlled response operations.
            </p>
            <p className="text-xs text-text-muted/60">
              BridgeGuard is an independent observability platform. Not affiliated with or endorsed by Chainlink Labs.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} BridgeGuard. Cross-chain security observability platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
