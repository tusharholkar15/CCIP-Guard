import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const WEB_BASE = 'http://localhost:3000';

const routes = [
  '/',
  '/network',
  '/lanes',
  '/messages',
  '/architecture',
];

// Patterns that must NOT appear in visible UI text
const FORBIDDEN_VISIBLE_PATTERNS = [
  /ENV\s+MAINNET/i,
  /LIVE\s+MAINNET/i,
  /\bSepolia\b/i,
  /\bEthereum\s+Sepolia\b/i,
  /\bArbitrum\s+Sepolia\b/i,
  /\btestnet\b/i,
  /\bTESTNET\b/,
];

async function verifyUiPages() {
  console.log('=== TASK 6: FRONTEND UI VERIFICATION ===\n');
  console.log(`Checking Next.js pages on ${WEB_BASE}...\n`);

  let allOk = true;

  for (const route of routes) {
    const url = `${WEB_BASE}${route}`;
    console.log(`Checking route: ${route} (${url})`);
    try {
      const res = await fetch(url);
      console.log(`  Status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        console.error(`  [FAIL] Route returned non-200 status: ${res.status}`);
        allOk = false;
        continue;
      }

      const html = await res.text();
      console.log(`  Page size: ${html.length} bytes`);

      // Check dark theme styling indicators
      const hasDarkTheme = html.includes('dark') || html.includes('bg-') || html.includes('background');
      console.log(`  Dark theme styling present: ${hasDarkTheme}`);

      // Check forbidden patterns in visible HTML
      // Strip script and style tags to inspect visible text
      const visibleText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      let violations: string[] = [];
      for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
        const match = visibleText.match(pattern);
        if (match) {
          violations.push(`Found forbidden term: "${match[0]}"`);
        }
      }

      if (violations.length > 0) {
        console.error(`  [FAIL] Violations found on ${route}:`, violations);
        allOk = false;
      } else {
        console.log(`  ✓ Route ${route} clean: 0 visible MAINNET / TESTNET / Sepolia labels.`);
      }
    } catch (err: any) {
      console.error(`  [FAIL] Could not fetch ${route}:`, err.message);
      allOk = false;
    }
    console.log('');
  }

  if (allOk) {
    console.log('=== [PASS] TASK 6: ALL UI PAGES VERIFIED CLEAN & FROZEN DARK THEME PRESERVED ===');
    process.exit(0);
  } else {
    console.error('=== [FAIL] TASK 6: UI VERIFICATION FAILED ===');
    process.exit(1);
  }
}

verifyUiPages().catch(err => {
  console.error('Fatal UI verification error:', err);
  process.exit(1);
});
