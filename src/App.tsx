import { useEffect, useCallback, useState, useRef } from 'react';
import { useMempoolSocket } from './hooks/useMempoolSocket';
import { useAudioEngine } from './hooks/useAudioEngine';
import { ParticleVisualizer } from './components/ParticleVisualizer';
import type { MelodyEvent } from './audio/MelodyEngine';

function App() {
  const { 
    networkState, 
    recentTransactions, 
    lastBlock,
    isBlockEvent,
    clearBlockEvent,
  } = useMempoolSocket();

  const {
    state: audioState,
    recentMelodies,
    initialize: initializeAudio,
    start: startAudio,
    stop: stopAudio,
    toggleMute,
    toggleDrone,
    toggleMelody,
    toggleGong,
    setVolume,
    setStressLevel,
    triggerMelody,
    triggerBlockEvent,
    testGong,
  } = useAudioEngine();

  const [isEntering, setIsEntering] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [lastMelodyEvent, setLastMelodyEvent] = useState<MelodyEvent | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [blocksWitnessed, setBlocksWitnessed] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const processedTxsRef = useRef<Set<string>>(new Set());
  const melodyTimeoutRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Format session duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const [sessionDuration, setSessionDuration] = useState('0s');

  // Update session duration every second
  useEffect(() => {
    if (!hasEntered) return;
    const interval = setInterval(() => {
      setSessionDuration(formatDuration(Date.now() - sessionStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasEntered, sessionStart]);

  // Update audio engine with network stress level
  useEffect(() => {
    if (audioState.isPlaying) {
      setStressLevel(networkState.stressLevel);
    }
  }, [networkState.stressLevel, audioState.isPlaying, setStressLevel]);

  // Track block count ref to avoid setState in effect
  const blockCountRef = useRef(0);
  
  // Handle block events
  useEffect(() => {
    if (isBlockEvent && audioState.isPlaying) {
      triggerBlockEvent();
      blockCountRef.current += 1;
      // Update state in next frame to avoid sync setState
      requestAnimationFrame(() => {
        setBlocksWitnessed(blockCountRef.current);
      });
      const timeout = setTimeout(clearBlockEvent, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isBlockEvent, audioState.isPlaying, triggerBlockEvent, clearBlockEvent]);

  // Process a single transaction for melody
  const processTransactionForMelody = useCallback((tx: { txid: string; value: number }) => {
    if (!audioState.isPlaying || !audioState.melodyEnabled) return;
    if (processedTxsRef.current.has(tx.txid)) return;
    
    processedTxsRef.current.add(tx.txid);
    
    const melodyEvent = triggerMelody(tx.txid, tx.value);
    if (melodyEvent) {
      if (melodyTimeoutRef.current) {
        clearTimeout(melodyTimeoutRef.current);
      }
      setLastMelodyEvent(melodyEvent);
      melodyTimeoutRef.current = window.setTimeout(() => {
        setLastMelodyEvent(null);
        melodyTimeoutRef.current = null;
      }, 3000);
    }

    if (processedTxsRef.current.size > 1000) {
      const txids = Array.from(processedTxsRef.current);
      processedTxsRef.current = new Set(txids.slice(-500));
    }
  }, [audioState.isPlaying, audioState.melodyEnabled, triggerMelody]);

  // Process new transactions as they come in
  const latestTxRef = useRef<string | null>(null);
  useEffect(() => {
    if (recentTransactions.length === 0) return;
    
    const latestTx = recentTransactions[recentTransactions.length - 1];
    if (latestTx && latestTx.txid !== latestTxRef.current) {
      latestTxRef.current = latestTx.txid;
      requestAnimationFrame(() => {
        processTransactionForMelody(latestTx);
      });
    }
  }, [recentTransactions, processTransactionForMelody]);

  // Enter ZenPool handler
  const handleEnter = useCallback(async () => {
    setIsEntering(true);
    try {
      await initializeAudio();
      startAudio();
      setHasEntered(true);
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
    setIsEntering(false);
  }, [initializeAudio, startAudio]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (audioState.isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [audioState.isPlaying, startAudio, stopAudio]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Compute showControls based on fullscreen state
  const showControlsRef = useRef(true);
  
  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      showControlsRef.current = true;
      // Use RAF to update state
      requestAnimationFrame(() => setShowControls(true));
      return;
    }

    const handleMouseMove = () => {
      showControlsRef.current = true;
      requestAnimationFrame(() => setShowControls(true));
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        showControlsRef.current = false;
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  const formatSats = (sats: number): string => {
    if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`;
    if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(2)}M sats`;
    if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}K sats`;
    return `${sats} sats`;
  };

  const getStressColor = (level: number): string => {
    if (level < 0.3) return 'text-emerald-400';
    if (level < 0.6) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStressBgColor = (level: number): string => {
    if (level < 0.3) return 'bg-emerald-400';
    if (level < 0.6) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getStressLabel = (level: number): string => {
    if (level < 0.2) return 'Calm';
    if (level < 0.4) return 'Light';
    if (level < 0.6) return 'Moderate';
    if (level < 0.8) return 'Busy';
    return 'Congested';
  };

  const getWhaleEmoji = (value: number): string => {
    if (value >= 1_000_000_000) return '🐋🐋🐋';
    if (value >= 100_000_000) return '🐋🐋';
    if (value >= 10_000_000) return '🐋';
    return '🐟';
  };

  // Entry screen
  if (!hasEntered) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        <div className="vignette" />
        
        <div className="z-10 flex flex-col items-center gap-8 p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-4">
            <h1 className="font-display text-6xl md:text-8xl font-extralight tracking-[0.4em] text-white/90 mb-4">
              ZENPOOL
            </h1>
            <p className="text-xs text-white/40 tracking-[0.3em] uppercase">
              Bitcoin Sonification Engine
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                networkState.isConnected 
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                  : 'bg-red-400 animate-pulse'
              }`} 
            />
            <span className="text-sm text-white/50 font-light">
              {networkState.isConnected ? 'Connected to mempool.space' : 'Connecting...'}
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
              {isEntering ? 'Initializing...' : 'Begin'}
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </button>

          <p className="text-xs text-white/25 mt-6 text-center max-w-xs font-light leading-relaxed">
            Listen to the Bitcoin network.<br />
            Transactions become sound. Blocks become silence.
          </p>

          {/* Preview stats */}
          <div className="mt-8 flex gap-12 text-center">
            <div>
              <div className="text-2xl font-mono text-white/60 font-light">
                {networkState.currentBlockHeight.toLocaleString() || '—'}
              </div>
              <div className="text-[10px] text-white/25 uppercase tracking-[0.2em] mt-1">
                Block
              </div>
            </div>
            <div>
              <div className={`text-2xl font-mono font-light ${getStressColor(networkState.stressLevel)}`}>
                {getStressLabel(networkState.stressLevel)}
              </div>
              <div className="text-[10px] text-white/25 uppercase tracking-[0.2em] mt-1">
                Network
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main experience screen
  return (
    <div className={`w-full h-full flex flex-col relative ${isFullscreen ? 'cursor-none' : ''}`}>
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
        <div className={`text-center mb-6 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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

          {/* Melody notification */}
          {lastMelodyEvent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="animate-fade-in bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-cyan-400/20">
                <div className="text-cyan-400 text-xl font-mono font-light tracking-wider">
                  {getWhaleEmoji(lastMelodyEvent.value)} {lastMelodyEvent.notes.join(' → ')}
                </div>
                <div className="text-white/40 text-xs text-center mt-1">
                  {formatSats(lastMelodyEvent.value)}
                </div>
              </div>
            </div>
          )}

          {/* Block event overlay */}
          {isBlockEvent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-amber-400/5">
              <div className="text-center animate-pulse">
                <div className="text-amber-400 text-4xl mb-2">⛏️</div>
                <div className="text-amber-400/80 text-sm font-mono tracking-wider">
                  Block #{lastBlock?.height}
                </div>
              </div>
            </div>
          )}

          {/* Corner stats */}
          <div className="absolute top-3 left-3 text-[10px] text-white/30 font-mono">
            <span className={getStressColor(networkState.stressLevel)}>{getStressLabel(networkState.stressLevel)}</span>
            <span className="mx-2 text-white/10">•</span>
            <span>{(networkState.flowRate / 1000).toFixed(1)} kB/s</span>
          </div>

          <div className="absolute top-3 right-3 text-[10px] text-white/30 font-mono">
            #{networkState.currentBlockHeight.toLocaleString()}
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`mt-6 flex items-center gap-8 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${getStressBgColor(networkState.stressLevel)}`} />
            <span className="text-xs text-white/40 font-mono">{networkState.mempoolSize.toFixed(1)} MB</span>
          </div>
          <div className="text-xs text-white/30 font-mono">
            {networkState.medianFeeRate.toFixed(0)} sat/vB
          </div>
          <div className="text-xs text-white/30 font-mono">
            {recentMelodies.length} whales
          </div>
          <div className="text-xs text-white/20 font-mono">
            {blocksWitnessed} blocks witnessed
          </div>
          <div className="text-xs text-white/20 font-mono">
            {sessionDuration}
          </div>
        </div>
      </div>

      {/* Controls Bar - Bottom */}
      <div className={`controls-bar absolute bottom-0 left-0 right-0 p-4 transition-all duration-500 
                       ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          
          {/* Left: Playback */}
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

          {/* Center: Audio Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDrone}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all duration-300
                         ${audioState.droneEnabled 
                           ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/20' 
                           : 'bg-white/5 text-white/30 border border-white/5'}`}
            >
              Drone
            </button>
            <button
              onClick={toggleMelody}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all duration-300
                         ${audioState.melodyEnabled 
                           ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/20' 
                           : 'bg-white/5 text-white/30 border border-white/5'}`}
            >
              Melody
            </button>
            <button
              onClick={toggleGong}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all duration-300
                         ${audioState.gongEnabled 
                           ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20' 
                           : 'bg-white/5 text-white/30 border border-white/5'}`}
            >
              Gong
            </button>
            <button
              onClick={testGong}
              className="px-2 py-1.5 rounded-full text-[10px] transition-all duration-300
                         bg-white/5 text-white/20 border border-white/5 hover:text-amber-400 hover:border-amber-400/20"
              title="Test gong"
            >
              🔔
            </button>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                {audioState.isMuted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={audioState.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16"
              />
              <span className="text-[10px] text-white/30 w-6 font-mono">
                {audioState.volume}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white/30 hover:text-white/60 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
