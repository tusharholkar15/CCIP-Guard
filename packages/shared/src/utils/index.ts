export function truncateHash(hash: string, chars = 6): string {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '--';
  return new Date(ts).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--';
  return n.toLocaleString();
}

export function formatPercentage(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--';
  return `${(n * 100).toFixed(1)}%`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function chainIdToSelector(chainId: number): bigint {
  const map: Record<number, bigint> = {
    1: BigInt("5009297550715157269"),
    42161: BigInt("4949039107694359620"),
    10: BigInt("3734403246176062136"),
    8453: BigInt("15971525489660198786"),
    137: BigInt("4051564324087730216"),
    43114: BigInt("6433500567565415381"),
    56: BigInt("11490364981446865082"),
  };
  return map[chainId] ?? BigInt(0);
}

export function selectorToChainId(selector: bigint | string): number {
  const map: Record<string, number> = {
    '5009297550715157269': 1,
    '4949039107694359620': 42161,
    '3734403246176062136': 10,
    '15971525489660198786': 8453,
    '4051564324087730216': 137,
    '6433500567565415381': 43114,
    '11490364981446865082': 56,
  };
  return map[selector.toString()] ?? 0;
}
