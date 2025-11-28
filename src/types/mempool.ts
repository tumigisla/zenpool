// Types for mempool.space WebSocket API

export interface Transaction {
  txid: string;
  value: number;      // Total output value in satoshis
  vsize: number;      // Virtual size in vBytes
  fee: number;        // Fee in satoshis
  feeRate: number;    // Fee rate in sat/vB
  timestamp: number;  // When we received it
}

export interface BlockData {
  height: number;
  hash: string;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
}

export interface MempoolInfo {
  size: number;       // Transaction count
  bytes: number;      // Total vBytes
  usage: number;      // Memory usage
}

export interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface MempoolStats {
  mempoolInfo: MempoolInfo;
  fees: FeeEstimates;
  vBytesPerSecond: number;
}

export interface NetworkState {
  isConnected: boolean;
  stressLevel: number;        // 0.0 (calm) to 1.0 (congested)
  flowRate: number;           // vBytes per second
  currentBlockHeight: number;
  mempoolSize: number;        // in MB
  medianFeeRate: number;      // sat/vB
}

export interface TransactionBuffer {
  transactions: Transaction[];
  lastFlowCalculation: number;
  flowRate: number;
}

// WebSocket message types
export interface WSMessage {
  block?: BlockData;
  blocks?: BlockData[];
  mempoolInfo?: MempoolInfo;
  fees?: FeeEstimates;
  vBytesPerSecond?: number;
  transactions?: WSTransaction[];
  'mempool-blocks'?: MempoolBlock[];
}

export interface WSTransaction {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
}

export interface MempoolBlock {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: number[];
}

