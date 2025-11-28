import { useEffect, useCallback, useState, useRef } from 'react';
import { useMempoolSocket } from './hooks/useMempoolSocket';
import { useAudioEngine } from './hooks/useAudioEngine';
import { ParticleVisualizer } from './components/ParticleVisualizer';
import type { TransactionSoundEvent } from './audio/TransactionSoundEngine';

function App() {
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
    stop: stopAudio,
    setVolume,
    setStressLevel,
    triggerTransactionSound,
    triggerBlockEvent,
  } = useAudioEngine();

  const [isEntering, setIsEntering] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [lastSoundEvent, setLastSoundEvent] = useState<TransactionSoundEvent | null>(null);
  
  const soundTimeoutRef = useRef<number | null>(null);

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

  // Enter ZenPool handler
  const handleEnter = useCallback(async () => {
    setIsEntering(true);
    try {
      await initializeAudio();
      setVolume(100); // Set volume to 100%
      startAudio();
      setHasEntered(true);
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
    setIsEntering(false);
  }, [initializeAudio, startAudio, setVolume]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (audioState.isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [audioState.isPlaying, startAudio, stopAudio]);

  const getStressBgColor = (level: number): string => {
    if (level < 0.3) return 'bg-emerald-400';
    if (level < 0.6) return 'bg-amber-400';
    return 'bg-red-400';
  };

  // Entry screen
  if (!hasEntered) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        <div className="vignette" />
        
        <div className="z-10 flex flex-col items-center gap-8 p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-4">
            <h1 className="font-display text-6xl md:text-8xl font-extralight tracking-[0.4em] text-white/90">
              ZENPOOL
            </h1>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                networkState.isConnected 
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                  : 'bg-red-400 animate-pulse'
              }`} 
            />
            <span className="text-xs text-white/40 font-light tracking-wider uppercase">
              {networkState.isConnected ? 'Live' : 'Connecting'}
            </span>
          </div>

          {/* Enter Button */}
          <button 
            onClick={handleEnter}
            disabled={isEntering || !networkState.isConnected}
            className="group relative mt-4 px-16 py-5 bg-transparent
                       border border-white/20 hover:border-amber-400/60 
                       rounded-full text-white/70 hover:text-white
                       transition-all duration-700 tracking-[0.2em] uppercase text-sm font-light
                       hover:shadow-2xl hover:shadow-amber-400/20
                       disabled:opacity-30 disabled:cursor-not-allowed
                       disabled:hover:shadow-none disabled:hover:border-white/20"
          >
            <span className="relative z-10">
              {isEntering ? 'Starting...' : 'Begin'}
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </button>

          <p className="text-sm text-white/30 mt-8 font-light tracking-wide">
            Listen to Bitcoin
          </p>
        </div>

        {/* GitHub Link */}
        <a 
          href="https://github.com/tumigisla/zenpool"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 text-white/20 hover:text-white/50 transition-colors duration-300"
          title="View on GitHub"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    );
  }

  // Main experience screen
  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Vignette overlay */}
      <div className="vignette" />
      
      {/* Block mined flash */}
      {isBlockEvent && (
        <div className="fixed inset-0 bg-amber-400/10 pointer-events-none z-40" 
             style={{ animation: 'pulse 2s ease-out' }} />
      )}

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 p-4">
        
        {/* Minimal Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-extralight tracking-[0.4em] text-white/60">
            ZENPOOL
          </h1>
        </div>

        {/* Visualization Container */}
        <div className="w-full max-w-3xl aspect-video bg-black/20 rounded-xl border border-white/[0.03] 
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


          {/* Block event overlay */}
          {isBlockEvent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-amber-400/5">
              <div className="text-center animate-pulse">
                <div className="text-amber-400 text-4xl mb-2">🔔</div>
                <div className="text-amber-400/80 text-sm font-mono tracking-wider">
                  Block #{lastBlock?.height}
                </div>
              </div>
            </div>
          )}

          {/* Corner stats */}
          <div className="absolute top-3 left-3 flex items-center gap-3 text-[10px] text-white/30 font-mono">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${getStressBgColor(networkState.stressLevel)}`} />
              <span>{networkState.mempoolSize.toFixed(1)} MB</span>
            </div>
            <span className="text-white/15">•</span>
            <span>{networkState.medianFeeRate.toFixed(0)} sat/vB</span>
          </div>

          <div className="absolute top-3 right-3 text-[10px] text-white/30 font-mono">
            #{networkState.currentBlockHeight.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls Bar - Bottom */}
      <div className="controls-bar absolute bottom-0 left-0 right-0 p-4 z-[60]">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          {/* Playback */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 
                         hover:border-white/20 hover:bg-white/10
                         flex items-center justify-center transition-all duration-300"
              title={audioState.isPlaying ? 'Pause' : 'Play'}
            >
              {audioState.isPlaying ? (
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/60 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              audioState.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
