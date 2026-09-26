import { describe, it, expect } from 'vitest';
import {
  CCIPEventType,
  CCIPExecutionState,
  normalizeMessageSent,
  normalizeExecutionStateChanged,
  normalizeMessageExecuted,
  eventDeduplicationKey,
  type NormalizedCCIPEvent,
} from '../ccip-events';
import { CCIPMessageSentAbi, ExecutionStateChangedAbi, MessageExecutedAbi } from '../ccip-abis';

describe('CCIP Event Normalizers', () => {
  describe('eventDeduplicationKey', () => {
    it('should create unique key from txHash and logIndex', () => {
      const key = eventDeduplicationKey('0xabc123', 5);
      expect(key).toBe('0xabc123:5');
    });

    it('should produce different keys for different logIndex', () => {
      const key1 = eventDeduplicationKey('0xabc', 0);
      const key2 = eventDeduplicationKey('0xabc', 1);
      expect(key1).not.toBe(key2);
    });
  });

  describe('normalizeMessageSent', () => {
    const mockLog = {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      blockNumber: 100n,
      transactionHash: '0xtxhash123',
      logIndex: 0,
      args: {
        destChainSelector: BigInt('3478487238524512106'),
        sequenceNumber: 42n,
        message: {
          header: {
            messageId: '0xmsgid123',
            sourceChainSelector: BigInt('16015286601757825753'),
            destChainSelector: BigInt('3478487238524512106'),
            sequenceNumber: 42n,
          },
          sender: '0xsender',
          feeToken: '0xfeetoken',
          feeTokenAmount: 1000n,
        },
      },
    };

    it('should normalize a valid CCIPMessageSent log', () => {
      const result = normalizeMessageSent('Ethereum Sepolia', mockLog, 1700000000);
      expect(result.eventName).toBe(CCIPEventType.MESSAGE_SENT);
      expect(result.chain).toBe('Ethereum Sepolia');
      expect(result.messageId).toBe('0xmsgid123');
      expect(result.sourceChainSelector).toBe(BigInt('16015286601757825753'));
      expect(result.destinationChainSelector).toBe(BigInt('3478487238524512106'));
      expect(result.sequenceNumber).toBe(42n);
      expect(result.sender).toBe('0xsender');
      expect(result.feeToken).toBe('0xfeetoken');
      expect(result.timestamp).toBe(1700000000);
      expect(result.executionState).toBeNull();
    });

    it('should handle missing optional fields gracefully', () => {
      const sparseLog = {
        address: '0x1234',
        blockNumber: 50n,
        transactionHash: '0xtx',
        logIndex: 1,
        args: {
          destChainSelector: undefined,
          sequenceNumber: undefined,
          message: undefined,
        },
      };
      const result = normalizeMessageSent('test-chain', sparseLog);
      expect(result.messageId).toBeNull();
      expect(result.sourceChainSelector).toBeNull();
      expect(result.destinationChainSelector).toBeNull();
      expect(result.sender).toBeNull();
      expect(result.timestamp).toBeNull();
    });
  });

  describe('normalizeExecutionStateChanged', () => {
    const mockLog = {
      address: '0xoffRamp',
      blockNumber: 200n,
      transactionHash: '0xtx456',
      logIndex: 3,
      args: {
        sourceChainSelector: BigInt('16015286601757825753'),
        sequenceNumber: 42n,
        messageId: '0xmsgid123',
        state: 2, // SUCCESS
      },
    };

    it('should normalize a valid ExecutionStateChanged log', () => {
      const result = normalizeExecutionStateChanged('Arbitrum Sepolia', mockLog, 1700001000);
      expect(result.eventName).toBe(CCIPEventType.EXECUTION_STATE_CHANGED);
      expect(result.chain).toBe('Arbitrum Sepolia');
      expect(result.messageId).toBe('0xmsgid123');
      expect(result.sourceChainSelector).toBe(BigInt('16015286601757825753'));
      expect(result.sequenceNumber).toBe(42n);
      expect(result.executionState).toBe(CCIPExecutionState.SUCCESS);
    });

    it('should handle failure state', () => {
      const failLog = { ...mockLog, args: { ...mockLog.args, state: 3 } };
      const result = normalizeExecutionStateChanged('test', failLog);
      expect(result.executionState).toBe(CCIPExecutionState.FAILURE);
    });
  });

  describe('normalizeMessageExecuted', () => {
    it('should normalize a valid MessageExecuted log', () => {
      const log = {
        address: '0xrouter',
        blockNumber: 300n,
        transactionHash: '0xtx789',
        logIndex: 0,
        args: {
          messageId: '0xmsgid123',
          sourceChainSelector: BigInt('16015286601757825753'),
          offRamp: '0xoffRamp',
        },
      };
      const result = normalizeMessageExecuted('Arbitrum Sepolia', log);
      expect(result.eventName).toBe(CCIPEventType.MESSAGE_EXECUTED);
      expect(result.messageId).toBe('0xmsgid123');
      expect(result.sourceChainSelector).toBe(BigInt('16015286601757825753'));
    });
  });

  describe('ABI definitions', () => {
    it('should have CCIPMessageSent ABI with correct event name', () => {
      expect(CCIPMessageSentAbi[0].type).toBe('event');
      expect(CCIPMessageSentAbi[0].name).toBe('CCIPMessageSent');
    });

    it('should have ExecutionStateChanged ABI with correct event name', () => {
      expect(ExecutionStateChangedAbi[0].type).toBe('event');
      expect(ExecutionStateChangedAbi[0].name).toBe('ExecutionStateChanged');
    });

    it('should have MessageExecuted ABI with correct event name', () => {
      expect(MessageExecutedAbi[0].type).toBe('event');
      expect(MessageExecutedAbi[0].name).toBe('MessageExecuted');
    });

    it('should match actual on-chain CCIPMessageSent event selector on Ethereum Sepolia', async () => {
      const { toEventSelector } = await import('viem');
      expect(toEventSelector(CCIPMessageSentAbi[0])).toBe(
        '0x371bc2ff0a006f4ef863b1d27a065d4e9f938b6d883eb154572b4aea593b32cc'
      );
    });

    it('should match actual on-chain ExecutionStateChanged event selector on Arbitrum Sepolia', async () => {
      const { toEventSelector } = await import('viem');
      expect(toEventSelector(ExecutionStateChangedAbi[0])).toBe(
        '0x8c324ce1367b83031769f6a813e3bb4c117aba2185789d66b98b791405be6df2'
      );
    });

    it('should have ExecutionStateChanged with indexed messageId', () => {
      const event = ExecutionStateChangedAbi[0];
      const messageIdInput = event.inputs.find(i => i.name === 'messageId');
      expect(messageIdInput).toBeDefined();
      expect(messageIdInput!.indexed).toBe(true);
    });
  });
});
