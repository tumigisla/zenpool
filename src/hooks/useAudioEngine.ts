import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioEngine, getAudioEngine } from '../audio/AudioEngine';
import type { AudioEngineState } from '../audio/AudioEngine';
import type { TransactionSoundEvent } from '../audio/TransactionSoundEngine';

export interface UseAudioEngineReturn {
  state: AudioEngineState;
  recentSounds: TransactionSoundEvent[];
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
  toggleDrone: () => void;
  toggleTransactionSounds: () => void;
  toggleBowl: () => void;
  setVolume: (volume: number) => void;
  setStressLevel: (level: number) => void;
  triggerTransactionSound: (txid: string, value: number) => TransactionSoundEvent | null;
  triggerBlockEvent: () => void;
  testBowl: () => void;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isPlaying: false,
    isMuted: false,
    volume: 70,
    droneEnabled: true,
    transactionSoundsEnabled: true,
    bowlEnabled: true,
  });
  const [recentSounds, setRecentSounds] = useState<TransactionSoundEvent[]>([]);

  // Get or create the engine instance
  useEffect(() => {
    engineRef.current = getAudioEngine();
    setState(engineRef.current.getState());

    return () => {
      // Don't dispose on unmount - keep audio running
    };
  }, []);

  const updateState = useCallback(() => {
    if (engineRef.current) {
      setState(engineRef.current.getState());
      setRecentSounds(engineRef.current.getRecentSounds());
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!engineRef.current) return;
    
    await engineRef.current.initialize();
    updateState();
  }, [updateState]);

  const start = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.start();
    updateState();
  }, [updateState]);

  const stop = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.stop();
    updateState();
  }, [updateState]);

  const toggleMute = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleMute();
    updateState();
  }, [updateState]);

  const toggleDrone = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleDrone();
    updateState();
  }, [updateState]);

  const toggleTransactionSounds = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleTransactionSounds();
    updateState();
  }, [updateState]);

  const toggleBowl = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleBowl();
    updateState();
  }, [updateState]);

  const testBowl = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.testBowl();
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!engineRef.current) return;
    
    engineRef.current.setVolume(volume);
    updateState();
  }, [updateState]);

  const setStressLevel = useCallback((level: number) => {
    if (!engineRef.current) return;
    
    engineRef.current.setStressLevel(level);
  }, []);

  const triggerTransactionSound = useCallback((txid: string, value: number): TransactionSoundEvent | null => {
    if (!engineRef.current) return null;
    
    const event = engineRef.current.triggerTransactionSound(txid, value);
    if (event) {
      updateState(); // Update to get new sound in recentSounds
    }
    return event;
  }, [updateState]);

  const triggerBlockEvent = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.triggerBlockEvent();
  }, []);

  return {
    state,
    recentSounds,
    initialize,
    start,
    stop,
    toggleMute,
    toggleDrone,
    toggleTransactionSounds,
    toggleBowl,
    setVolume,
    setStressLevel,
    triggerTransactionSound,
    triggerBlockEvent,
    testBowl,
  };
}
