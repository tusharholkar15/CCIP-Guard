import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RobustCCIPWatcher } from '../ccip-watcher';
import { CheckpointManager } from '../ccip-checkpoint';
import { CCIPEventType, CCIPExecutionState } from '@bridgeguard/shared';

vi.mock('../ccip-checkpoint', () => ({
  CheckpointManager: {
    getLastProcessedBlock: vi.fn(),
    saveLastProcessedBlock: vi.fn(),
  },
}));

describe('Live CCIP Ingestion Pipeline', () => {
  let mockClient: any;
  let onEventMock: any;
  let watchEventCallbacks: Record<string, { onLogs: (logs: any[]) => Promise<void>; onError?: (err: any) => void }> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    watchEventCallbacks = {};

    mockClient = {
      getBlockNumber: vi.fn().mockResolvedValue(11763000n),
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1720000000n }),
      getLogs: vi.fn().mockResolvedValue([]),
      watchEvent: vi.fn((opts: any) => {
        // Capture callback for manual invocation in tests
        const key = opts.address;
        watchEventCallbacks[key] = {
          onLogs: opts.onLogs,
          onError: opts.onError,
        };
        return vi.fn(); // unwatch function
      }),
    };

    onEventMock = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Initializes live watcher and sets status to ACTIVE', async () => {
    (CheckpointManager.getLastProcessedBlock as any).mockResolvedValue(11763000n);

    const watcher = new RobustCCIPWatcher({
      chainKey: 'ETHEREUM_SEPOLIA',
      chainName: 'Ethereum Sepolia',
      chainId: 11155111,
      client: mockClient,
      onRampAddresses: ['0x1111111111111111111111111111111111111111'],
      onEvent: onEventMock,
      pollingIntervalMs: 3000,
    });

    await watcher.start();

    expect(watcher.getStatus()).toBe('ACTIVE');
    expect(mockClient.watchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        poll: true,
        pollingInterval: 3000,
      })
    );

    watcher.stop();
    expect(watcher.getStatus()).toBe('IDLE');
  });

  it('2. Ingests CCIPMessageSent log immediately and updates checkpoint', async () => {
    (CheckpointManager.getLastProcessedBlock as any).mockResolvedValue(11763000n);

    const onRampAddr = '0x1111111111111111111111111111111111111111';
    const watcher = new RobustCCIPWatcher({
      chainKey: 'ETHEREUM_SEPOLIA',
      chainName: 'Ethereum Sepolia',
      chainId: 11155111,
      client: mockClient,
      onRampAddresses: [onRampAddr],
      onEvent: onEventMock,
    });

    await watcher.start();

    // Simulate an incoming CCIPMessageSent event from viem live polling
    const mockLog = {
      transactionHash: '0xc2aea21e50c32e61d0c9de0f0de915bddd760112b9f2bb08b543c9171513cd04',
      blockNumber: 11762988n,
      logIndex: 2,
      args: {
        message: {
          header: {
            messageId: '0x64fd206b1aaeede63d17cd9e3cd802eb960b24751cc3d208ac20d9ae894e09b1',
            sourceChainSelector: 16015286601757825753n,
            destChainSelector: 3478487238524512106n,
            sequenceNumber: 61n,
          },
          sender: '0xc0e4691Dc10612c976EF7AFf66dcb5581F04B952',
          data: '0x',
          destTokenAmounts: [],
          feeToken: '0x0000000000000000000000000000000000000000',
          feeTokenAmount: 1000000000000000n,
        },
      },
    };

    const cb = watchEventCallbacks[onRampAddr];
    expect(cb).toBeDefined();

    await cb.onLogs([mockLog]);

    // Verify onEvent was called with normalized data
    expect(onEventMock).toHaveBeenCalledTimes(1);
    const emitted = onEventMock.mock.calls[0][0];
    expect(emitted.eventName).toBe(CCIPEventType.MESSAGE_SENT);
    expect(emitted.messageId).toBe('0x64fd206b1aaeede63d17cd9e3cd802eb960b24751cc3d208ac20d9ae894e09b1');
    expect(emitted.transactionHash).toBe('0xc2aea21e50c32e61d0c9de0f0de915bddd760112b9f2bb08b543c9171513cd04');

    // Verify checkpoint was updated
    expect(CheckpointManager.saveLastProcessedBlock).toHaveBeenCalledWith(
      11155111,
      'Ethereum Sepolia',
      11762988n
    );

    watcher.stop();
  });

  it('3. Deduplicates duplicate event emissions', async () => {
    (CheckpointManager.getLastProcessedBlock as any).mockResolvedValue(11763000n);

    const onRampAddr = '0x1111111111111111111111111111111111111111';
    const watcher = new RobustCCIPWatcher({
      chainKey: 'ETHEREUM_SEPOLIA',
      chainName: 'Ethereum Sepolia',
      chainId: 11155111,
      client: mockClient,
      onRampAddresses: [onRampAddr],
      onEvent: onEventMock,
    });

    await watcher.start();

    const mockLog = {
      transactionHash: '0xdup123',
      blockNumber: 11762990n,
      logIndex: 0,
      args: {
        message: {
          header: { messageId: '0xmsgdup', sourceChainSelector: 1n, destChainSelector: 2n },
          sender: '0xsender',
        },
      },
    };

    const cb = watchEventCallbacks[onRampAddr];
    // Deliver the same log twice
    await cb.onLogs([mockLog]);
    await cb.onLogs([mockLog]);

    expect(onEventMock).toHaveBeenCalledTimes(1);

    watcher.stop();
  });

  it('4. Recovers missed block gaps on startup', async () => {
    // Last processed block was 1000, current block is 1050 (gap of 50 blocks)
    (CheckpointManager.getLastProcessedBlock as any).mockResolvedValue(1000n);
    mockClient.getBlockNumber.mockResolvedValue(1050n);

    mockClient.getLogs.mockResolvedValue([
      {
        transactionHash: '0xrecoveredtx',
        blockNumber: 1025n,
        logIndex: 1,
        args: {
          message: {
            header: { messageId: '0xrecmsg', sourceChainSelector: 1n, destChainSelector: 2n },
            sender: '0xsender',
          },
        },
      },
    ]);

    const watcher = new RobustCCIPWatcher({
      chainKey: 'ETHEREUM_SEPOLIA',
      chainName: 'Ethereum Sepolia',
      chainId: 11155111,
      client: mockClient,
      onRampAddresses: ['0x1111111111111111111111111111111111111111'],
      onEvent: onEventMock,
    });

    await watcher.start();

    // Verify getLogs was called across the gap
    expect(mockClient.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 1001n,
        toBlock: 1050n,
      })
    );

    // Verify the recovered log was processed
    expect(onEventMock).toHaveBeenCalled();
    const emitted = onEventMock.mock.calls[0][0];
    expect(emitted.messageId).toBe('0xrecmsg');

    // Verify checkpoint progressed to latest block
    expect(CheckpointManager.saveLastProcessedBlock).toHaveBeenCalledWith(
      11155111,
      'Ethereum Sepolia',
      1050n
    );

    watcher.stop();
  });

  it('5. Auto-reconnects with exponential backoff on RPC error', async () => {
    (CheckpointManager.getLastProcessedBlock as any).mockResolvedValue(11763000n);

    const onRampAddr = '0x1111111111111111111111111111111111111111';
    const watcher = new RobustCCIPWatcher({
      chainKey: 'ETHEREUM_SEPOLIA',
      chainName: 'Ethereum Sepolia',
      chainId: 11155111,
      client: mockClient,
      onRampAddresses: [onRampAddr],
      onEvent: onEventMock,
    });

    await watcher.start();
    expect(watcher.getStatus()).toBe('ACTIVE');

    // Trigger onError from viem polling
    const cb = watchEventCallbacks[onRampAddr];
    cb.onError!(new Error('filter not found'));

    // Status transitions to RECONNECTING
    expect(watcher.getStatus()).toBe('RECONNECTING');

    // Advance timers to trigger backoff reconnect (max delay 10s + jitter)
    await vi.advanceTimersByTimeAsync(15000);

    // Watcher should have reconnected and returned to ACTIVE
    expect(watcher.getStatus()).toBe('ACTIVE');

    watcher.stop();
  });
});
