import { useEffect, useRef, useState, useCallback } from 'react';
import type { 
  Transaction, 
  NetworkState, 
  BlockData, 
  WSMessage,
  MempoolBlock 
} from '../types/mempool';

const MEMPOOL_WS_URL = 'wss://mempool.space/api/v1/ws';
const FLOW_CALCULATION_INTERVAL = 100; // ms
const BUFFER_WINDOW = 5000; // 5 seconds of transactions
const MAX_BUFFER_SIZE = 1000;

// Normalize flow rate to stress level (0-1)
// Based on typical Bitcoin network: ~3-7 tx/sec normal, 20+ during spikes
const normalizeFlowRate = (vBytesPerSecond: number): number => {
  // Average tx is ~250 vBytes, so 3-7 tx/sec = 750-1750 vB/s
  // Stress starts at ~5000 vB/s, max at ~50000 vB/s
  const MIN_FLOW = 500;
  const MAX_FLOW = 50000;
  const normalized = (vBytesPerSecond - MIN_FLOW) / (MAX_FLOW - MIN_FLOW);
  return Math.max(0, Math.min(1, normalized));
};

export interface MempoolSocketReturn {
  networkState: NetworkState;
  recentTransactions: Transaction[];
  lastBlock: BlockData | null;
  isBlockEvent: boolean;
  clearBlockEvent: () => void;
}

export function useMempoolSocket(): MempoolSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<Transaction[]>([]);
  const flowIntervalRef = useRef<number | null>(null);
  
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: false,
    stressLevel: 0,
    flowRate: 0,
    currentBlockHeight: 0,
    mempoolSize: 0,
    medianFeeRate: 0,
  });
  
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [lastBlock, setLastBlock] = useState<BlockData | null>(null);
  const [isBlockEvent, setIsBlockEvent] = useState(false);

  const clearBlockEvent = useCallback(() => {
    setIsBlockEvent(false);
  }, []);

  // Calculate flow rate from buffer
  const calculateFlowRate = useCallback(() => {
    const now = Date.now();
    const windowStart = now - BUFFER_WINDOW;
    
    // Filter to transactions within window
    const recentTxs = bufferRef.current.filter(tx => tx.timestamp >= windowStart);
    bufferRef.current = recentTxs; // Clean old transactions
    
    // Calculate total vBytes in window
    const totalVBytes = recentTxs.reduce((sum, tx) => sum + tx.vsize, 0);
    const flowRate = (totalVBytes / BUFFER_WINDOW) * 1000; // vBytes per second
    
    const stressLevel = normalizeFlowRate(flowRate);
    
    setNetworkState(prev => ({
      ...prev,
      flowRate,
      stressLevel,
    }));
    
    // Update recent transactions for display (last 5)
    setRecentTransactions(recentTxs.slice(-5));
  }, []);

  // Process incoming transaction
  const processTransaction = useCallback((tx: {
    txid: string;
    fee: number;
    vsize: number;
    value: number;
  }) => {
    const transaction: Transaction = {
      txid: tx.txid,
      value: tx.value,
      vsize: tx.vsize,
      fee: tx.fee,
      feeRate: tx.fee / tx.vsize,
      timestamp: Date.now(),
    };
    
    bufferRef.current.push(transaction);
    
    // Limit buffer size
    if (bufferRef.current.length > MAX_BUFFER_SIZE) {
      bufferRef.current = bufferRef.current.slice(-MAX_BUFFER_SIZE);
    }
  }, []);

  // Process mempool blocks to extract transaction data
  const processMempoolBlocks = useCallback((blocks: MempoolBlock[]) => {
    if (blocks.length > 0) {
      const firstBlock = blocks[0];
      // Use mempool block data to update network state
      setNetworkState(prev => ({
        ...prev,
        medianFeeRate: firstBlock.medianFee,
      }));
    }
  }, []);

  useEffect(() => {
    // Start flow calculation interval
    flowIntervalRef.current = window.setInterval(calculateFlowRate, FLOW_CALCULATION_INTERVAL);

    // Connect to WebSocket
    const connect = () => {
      const ws = new WebSocket(MEMPOOL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 Connected to mempool.space');
        setNetworkState(prev => ({ ...prev, isConnected: true }));
        
        // Subscribe to channels
        ws.send(JSON.stringify({
          action: 'init',
        }));
        
        ws.send(JSON.stringify({
          action: 'want',
          data: ['blocks', 'stats', 'mempool-blocks'],
        }));

        // Track a popular address to get transaction flow
        // This is the Binance cold wallet - always has activity
        ws.send(JSON.stringify({
          'track-address': 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          
          // Handle new block
          if (data.block) {
            console.log('⛏️ New block:', data.block.height);
            setLastBlock(data.block);
            setIsBlockEvent(true);
            setNetworkState(prev => ({
              ...prev,
              currentBlockHeight: data.block!.height,
            }));
          }
          
          // Handle blocks array (initial data)
          if (data.blocks && data.blocks.length > 0) {
            const latestBlock = data.blocks[0];
            setNetworkState(prev => ({
              ...prev,
              currentBlockHeight: latestBlock.height,
            }));
          }
          
          // Handle mempool info
          if (data.mempoolInfo) {
            setNetworkState(prev => ({
              ...prev,
              mempoolSize: data.mempoolInfo!.bytes / 1_000_000, // Convert to MB
            }));
          }
          
          // Handle fee estimates
          if (data.fees) {
            setNetworkState(prev => ({
              ...prev,
              medianFeeRate: data.fees!.halfHourFee,
            }));
          }
          
          // Handle vBytes per second from API
          if (data.vBytesPerSecond !== undefined) {
            const stressLevel = normalizeFlowRate(data.vBytesPerSecond);
            setNetworkState(prev => ({
              ...prev,
              flowRate: data.vBytesPerSecond!,
              stressLevel,
            }));
          }
          
          // Handle mempool blocks
          if (data['mempool-blocks']) {
            processMempoolBlocks(data['mempool-blocks']);
          }
          
          // Handle transactions (from address tracking)
          if (data.transactions) {
            data.transactions.forEach(processTransaction);
          }
          
          // Some messages come with address-transactions format
          const addressTx = (data as Record<string, unknown>)['address-transactions'];
          if (Array.isArray(addressTx)) {
            addressTx.forEach((tx: { txid: string; fee: number; vsize: number; value: number }) => {
              processTransaction(tx);
            });
          }
          
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 Disconnected from mempool.space');
        setNetworkState(prev => ({ ...prev, isConnected: false }));
        
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    // Cleanup
    return () => {
      if (flowIntervalRef.current) {
        clearInterval(flowIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [calculateFlowRate, processTransaction, processMempoolBlocks]);

  return {
    networkState,
    recentTransactions,
    lastBlock,
    isBlockEvent,
    clearBlockEvent,
  };
}

