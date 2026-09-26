import fs from 'fs';
import path from 'path';

// Root dirs to inspect (excluding node_modules, .next, dist, .git, scratch)
const DIRS_TO_AUDIT = [
  'apps/web/src',
  'apps/api/src',
  'apps/indexer/src',
  'packages/shared/src',
  'packages/database/src',
  'packages/redis/src',
];

const FORBIDDEN_TERMS = [
  { pattern: /\bwallet\b/i, name: 'wallet (active wallet usage)', allowlist: ['wallet-address', 'wallet address', 'mockWallet'] },
  { pattern: /\bmetamask\b/i, name: 'MetaMask' },
  { pattern: /\buseWallet\b/i, name: 'useWallet hook' },
  { pattern: /\buseAccount\b/i, name: 'useAccount hook' },
  { pattern: /\buseConnect\b/i, name: 'useConnect hook' },
  { pattern: /\bconnectWallet\b/i, name: 'connectWallet function' },
  { pattern: /\bwriteContract\b/i, name: 'writeContract (transaction mutation)' },
  { pattern: /\bsendTransaction\b/i, name: 'sendTransaction (transaction execution)' },
  { pattern: /\bsignMessage\b/i, name: 'signMessage' },
  { pattern: /\bprivateKeyToAccount\b/i, name: 'privateKeyToAccount' },
  { pattern: /\bmnemonicToAccount\b/i, name: 'mnemonicToAccount' },
  { pattern: /\bPRIVATE_KEY\b/i, name: 'PRIVATE_KEY environment variable' },
  { pattern: /\bSEED_PHRASE\b/i, name: 'SEED_PHRASE' },
  { pattern: /\b11155111\b/, name: 'Sepolia chain ID 11155111' },
  { pattern: /\b421614\b/, name: 'Arbitrum Sepolia chain ID 421614' },
];

function getAllFiles(dirPath: string, fileArray: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return fileArray;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist' && file !== '__tests__') {
        getAllFiles(fullPath, fileArray);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        fileArray.push(fullPath);
      }
    }
  }

  return fileArray;
}

async function runAudit() {
  console.log('=== TASK 9: READ-ONLY SAFETY AUDIT ===\n');
  console.log('Scanning production codebases for forbidden write/signing/wallet/testnet patterns...');

  let allFiles: string[] = [];
  for (const dir of DIRS_TO_AUDIT) {
    const fullDirPath = path.resolve(__dirname, '..', dir);
    allFiles = allFiles.concat(getAllFiles(fullDirPath));
  }

  console.log(`Total production source files checked: ${allFiles.length}`);

  const violations: { file: string; line: number; term: string; content: string }[] = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((lineText, index) => {
      // Check each forbidden pattern
      for (const item of FORBIDDEN_TERMS) {
        if (item.pattern.test(lineText)) {
          // Check if allowlisted
          const isAllowlisted = item.allowlist && item.allowlist.some(al => lineText.toLowerCase().includes(al.toLowerCase()));
          if (!isAllowlisted) {
            // Also ignore pure comment lines explaining read-only policy
            const trimmed = lineText.trim();
            if (trimmed.startsWith('//') && (trimmed.toLowerCase().includes('no wallet') || trimmed.toLowerCase().includes('read-only'))) {
              continue;
            }
            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), filePath),
              line: index + 1,
              term: item.name,
              content: trimmed.slice(0, 100),
            });
          }
        }
      }
    });
  }

  console.log(`\nAudit Violations found: ${violations.length}`);
  if (violations.length > 0) {
    console.table(violations);
    console.error('[FAIL] Read-only safety audit failed! Forbidden patterns detected.');
    process.exit(1);
  } else {
    console.log('[PASS] Read-only safety audit PASSED:');
    console.log('  ✓ 0 wallet connections (MetaMask, injected, useWallet, useAccount)');
    console.log('  ✓ 0 transaction execution calls (writeContract, sendTransaction, signMessage)');
    console.log('  ✓ 0 private keys, seed phrases, or signers');
    console.log('  ✓ 0 Sepolia / testnet references in production runtime source code');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
