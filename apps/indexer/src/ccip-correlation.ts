/**
 * CCIP Message Correlation Layer
 * 
 * Correlates CCIPMessageSent events on the source chain with
 * ExecutionStateChanged and MessageExecuted events on the destination chain.
 * 
 * Uses messageId as the primary correlation key.
 * In CCIP v1.6.1:
 * - messageId is in the message.header struct of CCIPMessageSent
 * - messageId is indexed topic[2] in ExecutionStateChanged
 * - messageId is a non-indexed field in MessageExecuted
 * 
 * This module is purely in-memory. It does NOT write to the database.
 * It prepares the transformation layer for Phase 2 database integration.
 */
import {
  type NormalizedCCIPEvent,
  CCIPEventType,
  CCIPExecutionState,
} from '@bridgeguard/shared';

/** Lifecycle state of a correlated CCIP message */
export enum MessageLifecycleState {
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

/** A fully correlated CCIP message with source and destination events */
export interface CorrelatedMessage {
  /** The CCIP messageId (bytes32 hex) */
  messageId: string;
  /** Current lifecycle state */
  lifecycleState: MessageLifecycleState;
  /** Source chain event (CCIPMessageSent) */
  sourceEvent: NormalizedCCIPEvent;
  /** Destination chain events (ExecutionStateChanged, MessageExecuted) */
  destinationEvents: NormalizedCCIPEvent[];
  /** CCIP sequence number */
  sequenceNumber: bigint | null;
  /** Source chain selector */
  sourceChainSelector: bigint | null;
  /** Destination chain selector */
  destinationChainSelector: bigint | null;
  /** Sender address */
  sender: string | null;
  /** Latency in milliseconds (destination timestamp - source timestamp), if both available */
  latencyMs: number | null;
}

/**
 * Determines the lifecycle state from an ExecutionStateChanged event.
 */
export function executionStateToLifecycle(state: CCIPExecutionState | null): MessageLifecycleState {
  switch (state) {
    case CCIPExecutionState.IN_PROGRESS:
      return MessageLifecycleState.IN_PROGRESS;
    case CCIPExecutionState.SUCCESS:
      return MessageLifecycleState.DELIVERED;
    case CCIPExecutionState.FAILURE:
      return MessageLifecycleState.FAILED;
    default:
      return MessageLifecycleState.SENT;
  }
}

/**
 * Correlates source chain events with destination chain events.
 * 
 * @param sentEvents - CCIPMessageSent events from source chains
 * @param executionEvents - ExecutionStateChanged events from destination chains
 * @param routerEvents - MessageExecuted events from destination routers
 * @returns Array of correlated messages with lifecycle state
 */
export function correlateMessages(
  sentEvents: NormalizedCCIPEvent[],
  executionEvents: NormalizedCCIPEvent[],
  routerEvents: NormalizedCCIPEvent[],
): CorrelatedMessage[] {
  const results: CorrelatedMessage[] = [];

  // Index execution events by messageId for O(1) lookup
  const executionByMessageId = new Map<string, NormalizedCCIPEvent[]>();
  for (const event of executionEvents) {
    if (!event.messageId) continue;
    const existing = executionByMessageId.get(event.messageId) || [];
    existing.push(event);
    executionByMessageId.set(event.messageId, existing);
  }

  // Index router events by messageId
  const routerByMessageId = new Map<string, NormalizedCCIPEvent[]>();
  for (const event of routerEvents) {
    if (!event.messageId) continue;
    const existing = routerByMessageId.get(event.messageId) || [];
    existing.push(event);
    routerByMessageId.set(event.messageId, existing);
  }

  // Correlate each sent event with its destination events
  for (const sent of sentEvents) {
    if (!sent.messageId) continue;

    const execEvents = executionByMessageId.get(sent.messageId) || [];
    const routeEvents = routerByMessageId.get(sent.messageId) || [];
    const destinationEvents = [...execEvents, ...routeEvents];

    // Determine lifecycle state from the latest execution event
    let lifecycleState = MessageLifecycleState.SENT;
    let latestExec: NormalizedCCIPEvent | null = null;
    for (const exec of execEvents) {
      if (!latestExec || exec.blockNumber > latestExec.blockNumber) {
        latestExec = exec;
      }
    }
    if (latestExec) {
      lifecycleState = executionStateToLifecycle(latestExec.executionState);
    }

    // Calculate latency if both timestamps are available
    let latencyMs: number | null = null;
    if (sent.timestamp && latestExec?.timestamp) {
      latencyMs = (latestExec.timestamp - sent.timestamp) * 1000;
    }

    results.push({
      messageId: sent.messageId,
      lifecycleState,
      sourceEvent: sent,
      destinationEvents,
      sequenceNumber: sent.sequenceNumber,
      sourceChainSelector: sent.sourceChainSelector,
      destinationChainSelector: sent.destinationChainSelector,
      sender: sent.sender,
      latencyMs,
    });
  }

  return results;
}
