/**
 * CCIP Event Normalization Layer
 * Transforms raw viem log entries into a standardized internal format.
 */

/** Supported CCIP event types */
export enum CCIPEventType {
  MESSAGE_SENT = 'CCIPMessageSent',
  EXECUTION_STATE_CHANGED = 'ExecutionStateChanged',
  MESSAGE_EXECUTED = 'MessageExecuted',
}

/** CCIP Execution states (from OffRamp) */
export enum CCIPExecutionState {
  UNTOUCHED = 0,
  IN_PROGRESS = 1,
  SUCCESS = 2,
  FAILURE = 3,
}

/**
 * Normalized CCIP event record.
 * Internal representation capturing all fields needed for lifecycle tracking.
 */
export interface NormalizedCCIPEvent {
  /** Chain name where this event was observed */
  chain: string;
  /** Contract address that emitted the event */
  contractAddress: string;
  /** CCIP event type */
  eventName: CCIPEventType;
  /** Block number where the event was emitted */
  blockNumber: bigint;
  /** Transaction hash containing the event */
  transactionHash: string;
  /** Log index within the transaction */
  logIndex: number;
  /** Block timestamp (seconds since epoch), if fetched */
  timestamp: number | null;
  /** CCIP chain selector of the source chain, if available */
  sourceChainSelector: bigint | null;
  /** CCIP chain selector of the destination chain, if available */
  destinationChainSelector: bigint | null;
  /** CCIP sequence number, if available */
  sequenceNumber: bigint | null;
  /** CCIP message ID (bytes32), if available */
  messageId: string | null;
  /** Execution state (for ExecutionStateChanged only) */
  executionState: CCIPExecutionState | null;
  /** Sender address (for CCIPMessageSent only) */
  sender: string | null;
  /** Receiver address (for CCIPMessageSent only) */
  receiver?: string | null;
  /** Fee token address (for CCIPMessageSent only) */
  feeToken: string | null;
  /** Fee token amount (for CCIPMessageSent only) */
  feeTokenAmount: bigint | null;
}

/**
 * Creates a unique deduplication key for a log entry.
 * Used to prevent processing the same event twice.
 */
export function eventDeduplicationKey(txHash: string, logIndex: number): string {
  return `${txHash}:${logIndex}`;
}

/**
 * Normalizes a raw CCIPMessageSent log into our internal format.
 * Supports both CCIP v1.6 OnRamp format and legacy mock formats.
 */
export function normalizeMessageSent(
  chain: string,
  log: {
    address: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
    args: any;
  },
  timestamp: number | null = null,
): NormalizedCCIPEvent {
  const args = log.args || {};

  const messageId: string | null = args.messageId ?? args.message?.header?.messageId ?? null;
  const sender: string | null = args.sender ?? args.message?.sender ?? null;
  let destinationChainSelector: bigint | null = args.destChainSelector ?? args.message?.header?.destChainSelector ?? null;
  let sourceChainSelector: bigint | null = args.message?.header?.sourceChainSelector ?? null;
  let sequenceNumber: bigint | null = args.sequenceNumber ?? args.message?.header?.sequenceNumber ?? null;
  const feeToken: string | null = args.feeToken ?? args.message?.feeToken ?? null;
  let feeTokenAmount: bigint | null = args.feeTokenAmount ?? args.message?.feeTokenAmount ?? null;
  let receiver: string | null = null;

  // Extract from encodedMessage if available (CCIP v1.6 EVM2Any / Any2EVM message payload)
  if (args.encodedMessage && typeof args.encodedMessage === 'string' && args.encodedMessage.length >= 52) {
    try {
      const raw = args.encodedMessage.startsWith('0x') ? args.encodedMessage.slice(2) : args.encodedMessage;
      if (!sourceChainSelector) {
        sourceChainSelector = BigInt('0x' + raw.slice(2, 18));
      }
      if (!destinationChainSelector) {
        destinationChainSelector = BigInt('0x' + raw.slice(18, 34));
      }
      if (!sequenceNumber) {
        sequenceNumber = BigInt('0x' + raw.slice(34, 50));
      }
      if (sender) {
        const senderHex = sender.toLowerCase().replace('0x', '');
        const idx = raw.toLowerCase().indexOf(senderHex);
        if (idx !== -1) {
          const match = raw.slice(idx + 40).match(/14([0-9a-f]{40})/);
          if (match) {
            receiver = '0x' + match[1];
          }
        }
      }
    } catch {
      // Fallback gracefully on parsing failure
    }
  }

  // Calculate feeTokenAmount from receipts if available
  if (feeTokenAmount == null && Array.isArray(args.receipts)) {
    try {
      feeTokenAmount = args.receipts.reduce((sum: bigint, r: any) => sum + BigInt(r.feeTokenAmount || 0), 0n);
    } catch {
      // Fallback gracefully
    }
  }

  return {
    chain,
    contractAddress: log.address,
    eventName: CCIPEventType.MESSAGE_SENT,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    timestamp,
    sourceChainSelector,
    destinationChainSelector,
    sequenceNumber,
    messageId,
    executionState: null,
    sender,
    receiver: receiver || sender || null,
    feeToken,
    feeTokenAmount,
  };
}

/**
 * Normalizes a raw ExecutionStateChanged log into our internal format.
 */
export function normalizeExecutionStateChanged(
  chain: string,
  log: {
    address: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
    args: {
      sourceChainSelector?: bigint;
      sequenceNumber?: bigint;
      messageId?: string;
      state?: number;
    };
  },
  timestamp: number | null = null,
): NormalizedCCIPEvent {
  return {
    chain,
    contractAddress: log.address,
    eventName: CCIPEventType.EXECUTION_STATE_CHANGED,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    timestamp,
    sourceChainSelector: log.args.sourceChainSelector ?? null,
    destinationChainSelector: null,
    sequenceNumber: log.args.sequenceNumber ?? null,
    messageId: log.args.messageId ?? null,
    executionState: (log.args.state as CCIPExecutionState) ?? null,
    sender: null,
    feeToken: null,
    feeTokenAmount: null,
  };
}

/**
 * Normalizes a raw MessageExecuted log into our internal format.
 */
export function normalizeMessageExecuted(
  chain: string,
  log: {
    address: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
    args: {
      messageId?: string;
      sourceChainSelector?: bigint;
      offRamp?: string;
    };
  },
  timestamp: number | null = null,
): NormalizedCCIPEvent {
  return {
    chain,
    contractAddress: log.address,
    eventName: CCIPEventType.MESSAGE_EXECUTED,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    timestamp,
    sourceChainSelector: log.args.sourceChainSelector ?? null,
    destinationChainSelector: null,
    sequenceNumber: null,
    messageId: log.args.messageId ?? null,
    executionState: null,
    sender: null,
    feeToken: null,
    feeTokenAmount: null,
  };
}
