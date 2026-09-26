export const SUPPORTED_CHAINS = {
  // --- MAINNET CHAINS ---
  ETHEREUM: {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    chainSelector: BigInt("5009297550715157269"),
    rpcEnvVar: 'ETHEREUM_RPC_URL',
    explorerUrl: 'https://etherscan.io',
    routerAddress: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D' as `0x${string}`,
  },
  ARBITRUM: {
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum',
    chainSelector: BigInt("4949039107694359620"),
    rpcEnvVar: 'ARBITRUM_RPC_URL',
    explorerUrl: 'https://arbiscan.io',
    routerAddress: '0x141fa059441E0ca23ce184B6A78bafD2A517DdE8' as `0x${string}`,
  },
  OPTIMISM: {
    chainId: 10,
    name: 'optimism',
    displayName: 'Optimism',
    chainSelector: BigInt("3734403246176062136"),
    rpcEnvVar: 'OPTIMISM_RPC_URL',
    explorerUrl: 'https://optimistic.etherscan.io',
    routerAddress: '0x3206695CaE29952f4b0c22a169725a865bc8Ce0f' as `0x${string}`,
  },
  BASE: {
    chainId: 8453,
    name: 'base',
    displayName: 'Base',
    chainSelector: BigInt("15971525489660198786"),
    rpcEnvVar: 'BASE_RPC_URL',
    explorerUrl: 'https://basescan.org',
    routerAddress: '0x881e3A65B4d4a04dD529061dd0071cf975F58bCD' as `0x${string}`,
  },
  POLYGON: {
    chainId: 137,
    name: 'polygon',
    displayName: 'Polygon',
    chainSelector: BigInt("4051564324087730216"),
    rpcEnvVar: 'POLYGON_RPC_URL',
    explorerUrl: 'https://polygonscan.com',
    routerAddress: '0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe' as `0x${string}`,
  },
  AVALANCHE: {
    chainId: 43114,
    name: 'avalanche',
    displayName: 'Avalanche',
    chainSelector: BigInt("6433500567565415381"),
    rpcEnvVar: 'AVALANCHE_RPC_URL',
    explorerUrl: 'https://snowtrace.io',
    routerAddress: '0xF4c7E640EdA248ef95972845a62bdC74237805dB' as `0x${string}`,
  },
  BNB: {
    chainId: 56,
    name: 'bnb',
    displayName: 'BNB Chain',
    chainSelector: BigInt("11490364981446865082"),
    rpcEnvVar: 'BNB_RPC_URL',
    explorerUrl: 'https://bscscan.com',
    routerAddress: '0x34B03Cb9086d7D758AC55af71584F81A598759FE' as `0x${string}`,
  },
} as const;

/** Known CCIP Chain Selectors and metadata across the CCIP network */
export const CCIP_CHAIN_SELECTORS: Record<string, { chainId: number; name: string; displayName: string }> = {
  // Mainnets
  '5009297550715157269': { chainId: 1, name: 'ethereum', displayName: 'Ethereum' },
  '4949039107694359620': { chainId: 42161, name: 'arbitrum', displayName: 'Arbitrum' },
  '3734403246176062136': { chainId: 10, name: 'optimism', displayName: 'Optimism' },
  '15971525489660198786': { chainId: 8453, name: 'base', displayName: 'Base' },
  '4051564324087730216': { chainId: 137, name: 'polygon', displayName: 'Polygon' },
  '6433500567565415381': { chainId: 43114, name: 'avalanche', displayName: 'Avalanche' },
  '11490364981446865082': { chainId: 56, name: 'bnb', displayName: 'BNB Chain' },
};

export const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  137: 'Polygon',
  43114: 'Avalanche',
  56: 'BNB Chain',
};

export const CHAIN_NAME_TO_ID: Record<string, number> = {
  'ethereum': 1,
  'arbitrum': 42161,
  'optimism': 10,
  'base': 8453,
  'polygon': 137,
  'avalanche': 43114,
  'bnb': 56,
};

export const CCIP_FEE_TOKENS = {
  ETHEREUM: {
    NATIVE: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA' as `0x${string}`,
  },
  ARBITRUM: {
    NATIVE: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' as `0x${string}`,
  },
} as const;

export const CCIP_EVENT_SIGNATURES = {
  CCIPSendRequested: 'CCIPSendRequested(bytes32,(uint64,uint64,address,address,bytes,address[],uint256[],bytes[]))',
  CommitReportAccepted: 'CommitReportAccepted((bytes32,(uint64,uint64))[])',
  ExecutionStateChanged: 'ExecutionStateChanged(uint64 indexed sourceChainSelector, uint64 indexed sequenceNumber, bytes32 indexed messageId, uint8 state, bytes returnData)',
} as const;

export const METRIC_WINDOWS = ['1m', '5m', '15m', '1h'] as const;
export type MetricWindow = typeof METRIC_WINDOWS[number];

export const INCIDENT_THRESHOLDS = {
  HIGH_LATENCY_MS: 300000,
  FAILURE_SPIKE_RATE: 0.1,
  MESSAGE_BACKLOG_COUNT: 50,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
