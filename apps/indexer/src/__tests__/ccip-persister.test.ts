import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processNormalizedEvent, mapExecutionState } from '../ccip-persister';
import { db, messages } from '@bridgeguard/database';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';
import { CCIPEventType, CCIPExecutionState, NormalizedCCIPEvent } from '@bridgeguard/shared';

vi.mock('@bridgeguard/database', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
  messages: {
    ccipMessageId: 'ccipMessageId'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val }))
}));

vi.mock('@bridgeguard/redis', () => ({
  publishEvent: vi.fn(),
  CHANNELS: { MESSAGE_UPDATED: 'MESSAGE_UPDATED' }
}));

const mockResolveLane = vi.fn().mockResolvedValue('mock-lane-id');

describe('ccip-persister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSelectMock = (existingRow: any = null) => {
    const whereMock = vi.fn().mockResolvedValue(existingRow ? [existingRow] : []);
    const fromMock = vi.fn(() => ({ where: whereMock }));
    (db.select as any).mockImplementation(() => ({ from: fromMock }));
  };

  const setupUpdateMock = () => {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: whereMock }));
    (db.update as any).mockImplementation(() => ({ set: setMock }));
    return { setMock, whereMock };
  };

  const setupInsertMock = (throwError = false) => {
    const valuesMock = vi.fn().mockImplementation(() => {
      if (throwError) {
        const error = new Error('Unique violation');
        (error as any).code = '23505';
        throw error;
      }
      return Promise.resolve();
    });
    (db.insert as any).mockImplementation(() => ({ values: valuesMock }));
    return { valuesMock };
  };

  it('1. CCIPMessageSent creates a new lifecycle record', async () => {
    setupSelectMock();
    const { valuesMock } = setupInsertMock();
    
    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.MESSAGE_SENT,
      chain: 'Ethereum',
      transactionHash: '0xabc',
      blockNumber: 100n,
      timestamp: 1000,
      sequenceNumber: 1n,
      sender: '0xsender',
      feeToken: '0xfee',
      feeTokenAmount: 100n,
      sourceChainSelector: 5009297550715157269n,
      destinationChainSelector: 16015286601757825753n,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    
    expect(valuesMock).toHaveBeenCalled();
    const insertPayload = valuesMock.mock.calls[0][0];
    expect(insertPayload.ccipMessageId).toBe('msg-1');
    expect(insertPayload.state).toBe('SENT');
    expect(insertPayload.sourceTxHash).toBe('0xabc');
    expect(insertPayload.sourceTimestamp).toEqual(new Date(1000000));
    expect(publishEvent).toHaveBeenCalledWith(CHANNELS.MESSAGE_UPDATED, expect.any(Object));
  });

  it('2. ExecutionStateChanged matches the same messageId', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-1',
      state: 'SENT',
      sourceTimestamp: new Date(1000000)
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.EXECUTION_STATE_CHANGED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
      executionState: CCIPExecutionState.IN_PROGRESS,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);

    expect(setMock).toHaveBeenCalled();
    const updatePayload = (setMock.mock.calls[0] as any)[0];
    expect(updatePayload.state).toBe('PROCESSING');
    expect(updatePayload.destinationTxHash).toBe('0xdef');
    expect(updatePayload.latencyMs).toBe(1000000); // 2000000 - 1000000
    expect(publishEvent).toHaveBeenCalledWith(CHANNELS.MESSAGE_UPDATED, expect.any(Object));
  });

  it('3. MessageExecuted matches the same messageId', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-1',
      state: 'PROCESSING',
      sourceTimestamp: new Date(1000000)
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.MESSAGE_EXECUTED,
      chain: 'Optimism',
      transactionHash: '0xghi',
      blockNumber: 300n,
      timestamp: 3000,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);

    expect(setMock).toHaveBeenCalled();
    const updatePayload = (setMock.mock.calls[0] as any)[0];
    expect(updatePayload.state).toBe('SUCCESS');
    expect(updatePayload.latencyMs).toBe(2000000); // 3000000 - 1000000
    expect(publishEvent).toHaveBeenCalledWith(CHANNELS.MESSAGE_UPDATED, expect.any(Object));
  });

  it('5. duplicate logs are ignored (idempotent updates)', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-1',
      state: 'SENT',
      sourceTxHash: '0xabc',
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.MESSAGE_SENT,
      chain: 'Ethereum',
      transactionHash: '0xabc',
      blockNumber: 100n,
      timestamp: 1000,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    
    // It will still update the DB with the same values, but won't trigger Redis again
    expect(setMock).toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('6. repeated lifecycle events are idempotent', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-1',
      state: 'PROCESSING',
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.EXECUTION_STATE_CHANGED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
      executionState: CCIPExecutionState.IN_PROGRESS,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    expect(setMock).toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('7. destination event arriving before source event is retained safely', async () => {
    setupSelectMock(null); // No existing record
    const { valuesMock } = setupInsertMock();

    const event = {
      messageId: 'msg-dest-first',
      eventName: CCIPEventType.MESSAGE_EXECUTED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
      sourceChainSelector: 5009297550715157269n,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);

    expect(valuesMock).toHaveBeenCalled();
    const insertPayload = valuesMock.mock.calls[0][0];
    expect(insertPayload.ccipMessageId).toBe('msg-dest-first');
    expect(insertPayload.state).toBe('SUCCESS');
    expect(insertPayload.destinationTxHash).toBe('0xdef');
  });

  it('8. missing messageId creates unresolved observation (skipped)', async () => {
    setupSelectMock();
    const { valuesMock } = setupInsertMock();

    const event = {
      eventName: CCIPEventType.MESSAGE_EXECUTED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    expect(valuesMock).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it('9. failure state is preserved', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-fail',
      state: 'FAILED',
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-fail',
      eventName: CCIPEventType.MESSAGE_EXECUTED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    
    expect(setMock).toHaveBeenCalled();
    const updatePayload = (setMock.mock.calls[0] as any)[0];
    expect(updatePayload.state).toBe('FAILED');
    expect(publishEvent).not.toHaveBeenCalled(); // State didn't change
  });

  it('12. missing timestamps produce null latency', async () => {
    setupSelectMock({
      ccipMessageId: 'msg-1',
      state: 'SENT',
      sourceTimestamp: undefined // Missing
    });
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.EXECUTION_STATE_CHANGED,
      chain: 'Optimism',
      transactionHash: '0xdef',
      blockNumber: 200n,
      timestamp: 2000,
      executionState: CCIPExecutionState.SUCCESS,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    
    expect(setMock).toHaveBeenCalled();
    const updatePayload = (setMock.mock.calls[0] as any)[0];
    expect(updatePayload.latencyMs).toBeUndefined();
  });

  it('13. restart/replay does not duplicate records', async () => {
    setupSelectMock(null); 
    const { valuesMock } = setupInsertMock(true); // Throws unique violation
    const { setMock } = setupUpdateMock();

    const event = {
      messageId: 'msg-1',
      eventName: CCIPEventType.MESSAGE_SENT,
      chain: 'Ethereum',
      transactionHash: '0xabc',
      blockNumber: 100n,
      timestamp: 1000,
    } as unknown as NormalizedCCIPEvent;

    await processNormalizedEvent(event, mockResolveLane);
    
    expect(valuesMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled(); // Should fall back to update
  });
});
