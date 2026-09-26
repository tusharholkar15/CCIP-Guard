/**
 * Chainlink CCIP v1.6.1 ABI Definitions
 * Source of truth for all CCIP contract interactions in BridgeGuard.
 * 
 * References:
 * - https://docs.chain.link/ccip/api-reference/evm/v1.6.1/events
 * - Official Chainlink contracts-ccip@1.6.1
 */

/** OnRamp: CCIPMessageSent event (CCIP v1.6 OnRamp event signature) */
export const CCIPMessageSentAbi = [
  {
    type: 'event',
    name: 'CCIPMessageSent',
    inputs: [
      { name: 'destChainSelector', type: 'uint64', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'feeToken', type: 'address', indexed: false },
      { name: 'tokenAmountBeforeTokenPoolFees', type: 'uint256', indexed: false },
      { name: 'encodedMessage', type: 'bytes', indexed: false },
      {
        name: 'receipts',
        type: 'tuple[]',
        indexed: false,
        components: [
          { name: 'issuer', type: 'address' },
          { name: 'destGasLimit', type: 'uint32' },
          { name: 'destBytesOverhead', type: 'uint32' },
          { name: 'feeTokenAmount', type: 'uint256' },
          { name: 'extraArgs', type: 'bytes' },
        ],
      },
      { name: 'verifierBlobs', type: 'bytes[]', indexed: false },
    ],
  },
] as const;

/** OffRamp: ExecutionStateChanged event */
export const ExecutionStateChangedAbi = [
  {
    type: 'event',
    name: 'ExecutionStateChanged',
    inputs: [
      { name: 'sourceChainSelector', type: 'uint64', indexed: true },
      { name: 'sequenceNumber', type: 'uint64', indexed: true },
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'state', type: 'uint8', indexed: false },
      { name: 'returnData', type: 'bytes', indexed: false },
    ],
  },
] as const;

/** Router: MessageExecuted event */
export const MessageExecutedAbi = [
  {
    type: 'event',
    name: 'MessageExecuted',
    inputs: [
      { name: 'messageId', type: 'bytes32', indexed: false },
      { name: 'sourceChainSelector', type: 'uint64', indexed: false },
      { name: 'offRamp', type: 'address', indexed: false },
      { name: 'calldataHash', type: 'bytes32', indexed: false },
    ],
  },
] as const;

/** Router read-only functions */
export const CCIPRouterAbi = [
  {
    type: 'function',
    name: 'isChainSupported',
    stateMutability: 'view',
    inputs: [{ name: 'chainSelector', type: 'uint64' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getOnRamp',
    stateMutability: 'view',
    inputs: [{ name: 'destChainSelector', type: 'uint64' }],
    outputs: [{ name: 'onRampAddress', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getOffRamps',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'sourceChainSelector', type: 'uint64' },
          { name: 'offRamp', type: 'address' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getFee',
    stateMutability: 'view',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      {
        name: 'message',
        type: 'tuple',
        components: [
          { name: 'receiver', type: 'bytes' },
          { name: 'data', type: 'bytes' },
          { name: 'tokenAmounts', type: 'tuple[]', components: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ]},
          { name: 'feeToken', type: 'address' },
          { name: 'extraArgs', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'fee', type: 'uint256' }],
  },
] as const;

/**
 * Combined CCIP ABIs for convenience.
 * Use individual exports for specific contract interactions.
 */
export const CCIP_ABIS = {
  onRamp: CCIPMessageSentAbi,
  offRamp: ExecutionStateChangedAbi,
  router: [...MessageExecutedAbi, ...CCIPRouterAbi],
} as const;
