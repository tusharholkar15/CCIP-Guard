import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanCCIPEvents, type ScannerConfig, DEFAULT_CHUNK_SIZE } from '../ccip-scanner';

// Mock viem PublicClient
function createMockClient(overrides: Partial<{
  getBlockNumber: () => Promise<bigint>;
  getLogs: (args: any) => Promise<any[]>;
}> = {}) {
  return {
    getBlockNumber: overrides.getBlockNumber ?? (async () => 10000n),
    getLogs: overrides.getLogs ?? (async () => []),
  } as any;
}

function createTestConfig(client: any): ScannerConfig {
  return {
    chainKey: 'ETHEREUM_SEPOLIA',
    chainName: 'Ethereum Sepolia',
    client,
    onRampAddresses: ['0x1111111111111111111111111111111111111111'],
    offRampAddresses: ['0x2222222222222222222222222222222222222222'],
    routerAddresses: ['0x3333333333333333333333333333333333333333'],
    maxLookbackBlocks: 1000n,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };
}

describe('CCIP Scanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanCCIPEvents', () => {
    it('should return empty events when no logs exist', async () => {
      const client = createMockClient();
      const config = createTestConfig(client);
      const result = await scanCCIPEvents(config);

      expect(result.events).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.chain).toBe('Ethereum Sepolia');
    });

    it('should handle RPC connection failure gracefully', async () => {
      const client = createMockClient({
        getBlockNumber: async () => { throw new Error('Connection refused'); },
      });
      const config = createTestConfig(client);
      const result = await scanCCIPEvents(config);

      expect(result.events).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Connection refused');
    });

    it('should handle per-chunk RPC errors without aborting scan', async () => {
      let callCount = 0;
      const client = createMockClient({
        getBlockNumber: async () => 15000n,
        getLogs: async () => {
          callCount++;
          if (callCount === 2) throw new Error('Rate limited');
          return [];
        },
      });
      const config = { ...createTestConfig(client), maxLookbackBlocks: 10000n, chunkSize: 5000n };
      const result = await scanCCIPEvents(config);

      // Should have some errors but also continue scanning
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Rate limited'))).toBe(true);
    });

    it('should deduplicate events by txHash:logIndex', async () => {
      const duplicateLog = {
        address: '0x1111111111111111111111111111111111111111',
        blockNumber: 5000n,
        transactionHash: '0xdup',
        logIndex: 0,
        eventName: 'CCIPMessageSent',
        args: {
          destChainSelector: BigInt('3478487238524512106'),
          sequenceNumber: 1n,
          message: { header: { messageId: '0xmsg1' } },
        },
      };

      const client = createMockClient({
        getLogs: async () => [duplicateLog, duplicateLog],
      });
      const config = { ...createTestConfig(client), maxLookbackBlocks: 100n, chunkSize: 200n };
      const result = await scanCCIPEvents(config);

      // Even though getLogs returned duplicates, the scanner should deduplicate
      const msgSentEvents = result.events.filter(e => e.transactionHash === '0xdup');
      expect(msgSentEvents.length).toBeLessThanOrEqual(1);
    });

    it('should calculate correct block range', async () => {
      const client = createMockClient({
        getBlockNumber: async () => 50000n,
      });
      const config = { ...createTestConfig(client), maxLookbackBlocks: 10000n };
      const result = await scanCCIPEvents(config);

      expect(result.fromBlock).toBe(40000n);
      expect(result.toBlock).toBe(50000n);
    });

    it('should handle block number less than lookback', async () => {
      const client = createMockClient({
        getBlockNumber: async () => 500n,
      });
      const config = { ...createTestConfig(client), maxLookbackBlocks: 10000n };
      const result = await scanCCIPEvents(config);

      expect(result.fromBlock).toBe(0n);
      expect(result.toBlock).toBe(500n);
    });

    it('should include scan duration in result', async () => {
      const client = createMockClient();
      const config = createTestConfig(client);
      const result = await scanCCIPEvents(config);

      expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
