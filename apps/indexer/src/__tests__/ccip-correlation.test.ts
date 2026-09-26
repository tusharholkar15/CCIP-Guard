import { describe, it, expect } from 'vitest';
import {
  correlateMessages,
  executionStateToLifecycle,
  MessageLifecycleState,
} from '../ccip-correlation';
import {
  type NormalizedCCIPEvent,
  CCIPEventType,
  CCIPExecutionState,
} from '@bridgeguard/shared';

function createSentEvent(overrides: Partial<NormalizedCCIPEvent> = {}): NormalizedCCIPEvent {
  return {
    chain: 'Ethereum Sepolia',
    contractAddress: '0xOnRamp',
    eventName: CCIPEventType.MESSAGE_SENT,
    blockNumber: 100n,
    transactionHash: '0xtx1',
    logIndex: 0,
    timestamp: 1700000000,
    sourceChainSelector: BigInt('16015286601757825753'),
    destinationChainSelector: BigInt('3478487238524512106'),
    sequenceNumber: 1n,
    messageId: '0xmsg001',
    executionState: null,
    sender: '0xsender',
    feeToken: '0x0000000000000000000000000000000000000000',
    feeTokenAmount: 1000000n,
    ...overrides,
  };
}

function createExecEvent(overrides: Partial<NormalizedCCIPEvent> = {}): NormalizedCCIPEvent {
  return {
    chain: 'Arbitrum Sepolia',
    contractAddress: '0xOffRamp',
    eventName: CCIPEventType.EXECUTION_STATE_CHANGED,
    blockNumber: 200n,
    transactionHash: '0xtx2',
    logIndex: 0,
    timestamp: 1700001000,
    sourceChainSelector: BigInt('16015286601757825753'),
    destinationChainSelector: null,
    sequenceNumber: 1n,
    messageId: '0xmsg001',
    executionState: CCIPExecutionState.SUCCESS,
    sender: null,
    feeToken: null,
    feeTokenAmount: null,
    ...overrides,
  };
}

describe('CCIP Message Correlation', () => {
  describe('executionStateToLifecycle', () => {
    it('should map IN_PROGRESS to IN_PROGRESS', () => {
      expect(executionStateToLifecycle(CCIPExecutionState.IN_PROGRESS))
        .toBe(MessageLifecycleState.IN_PROGRESS);
    });

    it('should map SUCCESS to DELIVERED', () => {
      expect(executionStateToLifecycle(CCIPExecutionState.SUCCESS))
        .toBe(MessageLifecycleState.DELIVERED);
    });

    it('should map FAILURE to FAILED', () => {
      expect(executionStateToLifecycle(CCIPExecutionState.FAILURE))
        .toBe(MessageLifecycleState.FAILED);
    });

    it('should map UNTOUCHED to SENT', () => {
      expect(executionStateToLifecycle(CCIPExecutionState.UNTOUCHED))
        .toBe(MessageLifecycleState.SENT);
    });

    it('should map null to SENT', () => {
      expect(executionStateToLifecycle(null))
        .toBe(MessageLifecycleState.SENT);
    });
  });

  describe('correlateMessages', () => {
    it('should correlate sent event with matching execution event', () => {
      const sent = createSentEvent();
      const exec = createExecEvent();

      const results = correlateMessages([sent], [exec], []);

      expect(results).toHaveLength(1);
      expect(results[0].messageId).toBe('0xmsg001');
      expect(results[0].lifecycleState).toBe(MessageLifecycleState.DELIVERED);
      expect(results[0].sourceEvent).toBe(sent);
      expect(results[0].destinationEvents).toContain(exec);
    });

    it('should calculate latency when both timestamps available', () => {
      const sent = createSentEvent({ timestamp: 1700000000 });
      const exec = createExecEvent({ timestamp: 1700000120 });

      const results = correlateMessages([sent], [exec], []);

      expect(results[0].latencyMs).toBe(120000); // 120 seconds in ms
    });

    it('should handle sent event with no matching execution event', () => {
      const sent = createSentEvent({ messageId: '0xorphan' });

      const results = correlateMessages([sent], [], []);

      expect(results).toHaveLength(1);
      expect(results[0].lifecycleState).toBe(MessageLifecycleState.SENT);
      expect(results[0].destinationEvents).toHaveLength(0);
      expect(results[0].latencyMs).toBeNull();
    });

    it('should handle multiple sent events', () => {
      const sent1 = createSentEvent({ messageId: '0xmsg001' });
      const sent2 = createSentEvent({ messageId: '0xmsg002', transactionHash: '0xtx3' });
      const exec1 = createExecEvent({ messageId: '0xmsg001' });

      const results = correlateMessages([sent1, sent2], [exec1], []);

      expect(results).toHaveLength(2);
      const delivered = results.find(r => r.messageId === '0xmsg001');
      const pending = results.find(r => r.messageId === '0xmsg002');
      expect(delivered?.lifecycleState).toBe(MessageLifecycleState.DELIVERED);
      expect(pending?.lifecycleState).toBe(MessageLifecycleState.SENT);
    });

    it('should handle failed execution state', () => {
      const sent = createSentEvent();
      const exec = createExecEvent({ executionState: CCIPExecutionState.FAILURE });

      const results = correlateMessages([sent], [exec], []);

      expect(results[0].lifecycleState).toBe(MessageLifecycleState.FAILED);
    });

    it('should skip events with null messageId', () => {
      const sent = createSentEvent({ messageId: null });

      const results = correlateMessages([sent], [], []);

      expect(results).toHaveLength(0);
    });

    it('should include router events in destinationEvents', () => {
      const sent = createSentEvent();
      const routerEvent = createExecEvent({
        eventName: CCIPEventType.MESSAGE_EXECUTED,
        contractAddress: '0xRouter',
      });

      const results = correlateMessages([sent], [], [routerEvent]);

      expect(results[0].destinationEvents).toContain(routerEvent);
    });

    it('should use latest execution event for lifecycle state', () => {
      const sent = createSentEvent();
      const exec1 = createExecEvent({
        executionState: CCIPExecutionState.IN_PROGRESS,
        blockNumber: 200n,
      });
      const exec2 = createExecEvent({
        executionState: CCIPExecutionState.SUCCESS,
        blockNumber: 300n,
      });

      const results = correlateMessages([sent], [exec1, exec2], []);

      expect(results[0].lifecycleState).toBe(MessageLifecycleState.DELIVERED);
    });
  });
});
