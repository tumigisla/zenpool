import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMempoolSocket } from '../hooks/useMempoolSocket';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { ParticleVisualizer } from '../components/ParticleVisualizer';
import type { TransactionSoundEvent } from '../audio/TransactionSoundEngine';

export function AppPage() {
  const { 
    networkState, 
    recentTransactions, 
    lastBlock,
    isBlockEvent,
    clearBlockEvent,
    onTransaction,
  } = useMempoolSocket();

  const {
    state: audioState,
    initialize: initializeAudio,
    start: startAudio,
    setVolume,
    setStressLevel,
    triggerTransactionSound,
    triggerBlockEvent,
  } = useAudioEngine();

  const [isInitializing, setIsInitializing] = useState(true);
  const [lastSoundEvent, setLastSoundEvent] = useState<TransactionSoundEvent | null>(null);
  
  const soundTimeoutRef = useRef<number | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAudio();
        setVolume(100);
        startAudio();
      } catch (error) {
        console.error('Failed to start audio:', error);
      }
      setIsInitializing(false);
    };
    init();
  }, [initializeAudio, startAudio, setVolume]);

  // Update audio engine with network stress level
  useEffect(() => {
    if (audioState.isPlaying) {
      setStressLevel(networkState.stressLevel);
    }
  }, [networkState.stressLevel, audioState.isPlaying, setStressLevel]);

  // Handle block events
  useEffect(() => {
    if (isBlockEvent && audioState.isPlaying) {
      triggerBlockEvent();
      const timeout = setTimeout(clearBlockEvent, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isBlockEvent, audioState.isPlaying, triggerBlockEvent, clearBlockEvent]);

  // Subscribe to ALL transactions and trigger sounds
  useEffect(() => {
    if (!audioState.isPlaying || !audioState.transactionSoundsEnabled) return;

    const unsubscribe = onTransaction((tx) => {
      const soundEvent = triggerTransactionSound(tx.txid, tx.value);
      
      if (soundEvent) {
        // Show notification for larger transactions only (to avoid UI spam)
        if (tx.value >= 100_000) { // 0.001 BTC+
          if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
          }
          setLastSoundEvent(soundEvent);
          soundTimeoutRef.current = window.setTimeout(() => {
            setLastSoundEvent(null);
            soundTimeoutRef.current = null;
          }, 1500);
        }
      }
    });

    return unsubscribe;
  }, [audioState.isPlaying, audioState.transactionSoundsEnabled, onTransaction, triggerTransactionSound]);

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="vignette" />
        <div className="text-white/50 text-sm tracking-widest uppercase animate-pulse">
          Initializing...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Vignette overlay */}
      <div className="vignette" />
      
      {/* Block mined flash */}
      {isBlockEvent && (
        <div className="fixed inset-0 bg-amber-400/10 pointer-events-none z-40" 
             style={{ animation: 'pulse 2s ease-out' }} />
      )}

      {/* Main content - fills viewport */}
      <div className="flex-1 flex flex-col z-10 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        
        {/* Minimal Header */}
        <div className="text-center shrink-0">
          <Link to="/" className="inline-block">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.3em] sm:tracking-[0.4em] text-white/50 hover:text-white/70 transition-colors">
              ZENPOOL
            </h1>
          </Link>
        </div>

        {/* Visualization Container - takes remaining space */}
        <div className="flex-1 mt-4 sm:mt-6 mb-12 sm:mb-14 min-h-0 w-full max-w-6xl mx-auto">
          <div className="w-full h-full bg-black/20 rounded-lg sm:rounded-xl border border-white/[0.04] 
                          relative overflow-hidden backdrop-blur-sm">
            {/* Particle Canvas */}
            <ParticleVisualizer
              transactions={recentTransactions}
              stressLevel={networkState.stressLevel}
              isBlockEvent={isBlockEvent}
              highlightedTxId={lastSoundEvent?.txid}
            />

            {/* Ambient glow based on stress */}
            <div 
              className="absolute inset-0 pointer-events-none transition-all duration-2000"
              style={{
                background: `radial-gradient(ellipse at bottom, 
                  ${networkState.stressLevel < 0.3 ? 'rgba(52, 211, 153, 0.02)' : 
                    networkState.stressLevel < 0.6 ? 'rgba(251, 191, 36, 0.03)' : 
                    'rgba(239, 68, 68, 0.05)'} 0%, 
                  transparent 60%)`,
              }}
            />

            {/* Block event indicator */}
            {isBlockEvent && (
              <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 flex items-center gap-2 pointer-events-none animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-amber-400/80 font-mono tracking-wider">
                  Block #{lastBlock?.height}
                </span>
              </div>
            )}

            {/* Corner stats */}
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-white/40 font-mono">
              <span>{networkState.mempoolSize.toFixed(1)} MB</span>
              <span className="text-white/20">•</span>
              <span>{networkState.medianFeeRate.toFixed(0)} sat/vB</span>
            </div>

            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 text-[11px] sm:text-xs text-white/40 font-mono">
              #{networkState.currentBlockHeight.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Connection Status */}
      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex justify-center z-10">
        <div className="flex items-center gap-2.5">
          <div 
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              networkState.isConnected 
                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                : 'bg-red-400 animate-pulse'
            }`} 
          />
          <span className="text-xs text-white/40 font-light tracking-widest uppercase">
            {networkState.isConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </div>
    </div>
  );
}
