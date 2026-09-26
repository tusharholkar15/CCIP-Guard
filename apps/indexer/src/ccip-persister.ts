import {
  type NormalizedCCIPEvent,
  CCIPEventType,
  CCIPExecutionState,
  SUPPORTED_CHAINS,
  CCIP_CHAIN_SELECTORS,
  CHAIN_ID_TO_NAME,
} from '@bridgeguard/shared';
import { db, messages } from '@bridgeguard/database';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';
import { eq } from 'drizzle-orm';

/** Maps CCIP Execution State to our DB Enum */
export function mapExecutionState(state: CCIPExecutionState | null): 'SENT' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'DESTINATION_DETECTED' {
  switch (state) {
    case CCIPExecutionState.IN_PROGRESS:
      return 'PROCESSING';
    case CCIPExecutionState.SUCCESS:
      return 'SUCCESS';
    case CCIPExecutionState.FAILURE:
      return 'FAILED';
    case CCIPExecutionState.UNTOUCHED:
    default:
      return 'DESTINATION_DETECTED';
  }
}

/** Looks up a chain by its CCIP selector */
function getChainBySelector(selector: bigint | null) {
  if (!selector) return null;
  const str = selector.toString();
  for (const key of Object.keys(SUPPORTED_CHAINS)) {
    const chain = (SUPPORTED_CHAINS as any)[key];
    if (chain.chainSelector.toString() === str) {
      return chain;
    }
  }
  if (CCIP_CHAIN_SELECTORS[str]) {
    return CCIP_CHAIN_SELECTORS[str];
  }
  return null;
}

/** Looks up a chain by its name */
function getChainByName(name: string) {
  for (const key of Object.keys(SUPPORTED_CHAINS)) {
    const chain = (SUPPORTED_CHAINS as any)[key];
    if (chain.displayName === name || chain.name === name) {
      return chain;
    }
  }
  for (const info of Object.values(CCIP_CHAIN_SELECTORS)) {
    if (info.displayName === name || info.name === name) {
      return info;
    }
  }
  return null;
}

/**
 * Persists a normalized CCIP event idempotently to the database.
 * Handles partial observations gracefully.
 */
export async function processNormalizedEvent(
  event: NormalizedCCIPEvent,
  resolveLane: (srcId: number, dstId: number) => Promise<string | null>
): Promise<void> {
  if (!event.messageId) return;

  const existingRows = await db.select().from(messages).where(eq(messages.ccipMessageId, event.messageId));
  const existing = existingRows[0] || null;

  let state = existing ? existing.state : 'SENT';
  
  // Resolve chain IDs
  let sourceChainId = existing ? existing.sourceChainId : 0;
  let destChainId = existing ? existing.destinationChainId : 0;

  if (event.sourceChainSelector) {
    const srcChain = getChainBySelector(event.sourceChainSelector);
    if (srcChain) sourceChainId = srcChain.chainId;
  }
  if (event.destinationChainSelector) {
    const dstChain = getChainBySelector(event.destinationChainSelector);
    if (dstChain) destChainId = dstChain.chainId;
  }

  // Fallbacks if selectors were missing but we know the chain the event occurred on
  if (sourceChainId === 0 && event.eventName === CCIPEventType.MESSAGE_SENT) {
    const srcChain = getChainByName(event.chain);
    if (srcChain) sourceChainId = srcChain.chainId;
  }
  if (destChainId === 0 && (event.eventName === CCIPEventType.EXECUTION_STATE_CHANGED || event.eventName === CCIPEventType.MESSAGE_EXECUTED)) {
    const dstChain = getChainByName(event.chain);
    if (dstChain) destChainId = dstChain.chainId;
  }

  // Build the DB update object
  const updates: any = {
    updatedAt: new Date(),
  };

  if (event.eventName === CCIPEventType.MESSAGE_SENT) {
    if (!existing || existing.state === 'SENT') {
      state = 'SENT';
    }
    updates.sourceTxHash = event.transactionHash;
    updates.sourceBlockNumber = Number(event.blockNumber);
    if (event.timestamp) updates.sourceTimestamp = new Date(event.timestamp * 1000);
    if (event.sequenceNumber != null) updates.sequenceNumber = event.sequenceNumber;
    if (event.sender) updates.sender = event.sender;
    if (event.receiver) updates.receiver = event.receiver;
    if (event.feeToken) updates.feeToken = event.feeToken;
    if (event.feeTokenAmount != null) updates.feeTokenAmount = event.feeTokenAmount.toString();
    if (event.sourceChainSelector) updates.sourceChainSelector = event.sourceChainSelector.toString();
    if (event.destinationChainSelector) updates.destinationChainSelector = event.destinationChainSelector.toString();
  } 
  else if (event.eventName === CCIPEventType.EXECUTION_STATE_CHANGED) {
    state = mapExecutionState(event.executionState);
    updates.destinationTxHash = event.transactionHash;
    updates.destinationBlockNumber = Number(event.blockNumber);
    if (event.timestamp) updates.destinationTimestamp = new Date(event.timestamp * 1000);
    if (event.sequenceNumber != null) updates.sequenceNumber = event.sequenceNumber;
    if (event.sourceChainSelector) updates.sourceChainSelector = event.sourceChainSelector.toString();
    updates.executionState = event.executionState;
  }
  else if (event.eventName === CCIPEventType.MESSAGE_EXECUTED) {
    // MessageExecuted confirms success but shouldn't override a FAILED state if one exists incorrectly
    if (existing && existing.state === 'FAILED') {
      // Do nothing to state, preserve FAILED
    } else {
      state = 'SUCCESS';
    }
    updates.destinationTxHash = event.transactionHash;
    updates.destinationBlockNumber = Number(event.blockNumber);
    if (event.timestamp) updates.destinationTimestamp = new Date(event.timestamp * 1000);
    if (event.sourceChainSelector) updates.sourceChainSelector = event.sourceChainSelector.toString();
  }

  if (sourceChainId !== 0 && (!existing || existing.sourceChainId === 0)) {
    updates.sourceChainId = sourceChainId;
    updates.sourceChainName = CHAIN_ID_TO_NAME[sourceChainId] || 'Unknown';
  }
  if (destChainId !== 0 && (!existing || existing.destinationChainId === 0)) {
    updates.destinationChainId = destChainId;
    updates.destinationChainName = CHAIN_ID_TO_NAME[destChainId] || 'Unknown';
  }

  updates.state = state;

  // Calculate Latency
  const srcTime = updates.sourceTimestamp || existing?.sourceTimestamp;
  const dstTime = updates.destinationTimestamp || existing?.destinationTimestamp;
  if (srcTime && dstTime) {
    updates.latencyMs = dstTime.getTime() - srcTime.getTime();
  }

  if (existing) {
    // Update
    await db.update(messages).set(updates).where(eq(messages.ccipMessageId, event.messageId));
  } else {
    // Insert partial or full
    let laneId = await resolveLane(sourceChainId, destChainId);
    if (!laneId) {
      // Fallback lane if resolution failed to satisfy DB constraint
      laneId = '00000000-0000-0000-0000-000000000000';
    }
    
    const insertPayload = {
      ccipMessageId: event.messageId,
      sourceChainId,
      destinationChainId: destChainId,
      sourceChainName: CHAIN_ID_TO_NAME[sourceChainId] || 'Unknown',
      destinationChainName: CHAIN_ID_TO_NAME[destChainId] || 'Unknown',
      sender: event.sender || '',
      receiver: event.receiver || event.sender || '0xEncodedMessageReceiver',
      state: updates.state,
      laneId,
      ...updates
    };

    try {
      await db.insert(messages).values(insertPayload);
    } catch (err: any) {
      if (err.code === '23505') { // Postgres Unique Violation
        await db.update(messages).set(updates).where(eq(messages.ccipMessageId, event.messageId));
      } else {
        throw err;
      }
    }
  }

  // Only emit if state changed or new record
  if (!existing || existing.state !== state) {
    await publishEvent(CHANNELS.MESSAGE_UPDATED, {
      messageId: event.messageId,
      state: state,
      timestamp: new Date().toISOString()
    });
  }
}
