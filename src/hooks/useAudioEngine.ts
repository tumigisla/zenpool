import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioEngine, getAudioEngine } from '../audio/AudioEngine';
import type { AudioEngineState } from '../audio/AudioEngine';
import type { MelodyEvent } from '../audio/MelodyEngine';

export interface UseAudioEngineReturn {
  state: AudioEngineState;
  recentMelodies: MelodyEvent[];
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
  toggleDrone: () => void;
  toggleMelody: () => void;
  toggleGong: () => void;
  setVolume: (volume: number) => void;
  setStressLevel: (level: number) => void;
  triggerMelody: (txid: string, value: number) => MelodyEvent | null;
  triggerBlockEvent: () => void;
  testGong: () => void;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isPlaying: false,
    isMuted: false,
    volume: 70,
    droneEnabled: true,
    melodyEnabled: true,
    gongEnabled: true,
  });
  const [recentMelodies, setRecentMelodies] = useState<MelodyEvent[]>([]);

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
      setRecentMelodies(engineRef.current.getRecentMelodies());
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

  const toggleMelody = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleMelody();
    updateState();
  }, [updateState]);

  const toggleGong = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.toggleGong();
    updateState();
  }, [updateState]);

  const testGong = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.testGong();
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

  const triggerMelody = useCallback((txid: string, value: number): MelodyEvent | null => {
    if (!engineRef.current) return null;
    
    const event = engineRef.current.triggerMelody(txid, value);
    if (event) {
      updateState(); // Update to get new melody in recentMelodies
    }
    return event;
  }, [updateState]);

  const triggerBlockEvent = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.triggerBlockEvent();
  }, []);

  return {
    state,
    recentMelodies,
    initialize,
    start,
    stop,
    toggleMute,
    toggleDrone,
    toggleMelody,
    toggleGong,
    setVolume,
    setStressLevel,
    triggerMelody,
    triggerBlockEvent,
    testGong,
  };
}
