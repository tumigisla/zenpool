import * as Tone from 'tone';
import { DroneEngine } from './DroneEngine';
import { MelodyEngine } from './MelodyEngine';
import { GongEngine } from './GongEngine';
import type { MelodyEvent } from './MelodyEngine';

/**
 * AudioEngine - Main controller for all audio in ZenPool
 * 
 * Manages:
 * - Browser AudioContext initialization (requires user gesture)
 * - Drone engine (continuous ambient pad)
 * - Melody engine (hash-derived arpeggios)
 * - Gong engine (block mined celebration)
 */

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0-100
  droneEnabled: boolean;
  melodyEnabled: boolean;
  gongEnabled: boolean;
}

export class AudioEngine {
  private drone: DroneEngine;
  private melody: MelodyEngine;
  private gong: GongEngine;
  private _isInitialized = false;
  private _isMuted = false;
  private _volume = 70; // 0-100
  private _droneEnabled = true;
  private _melodyEnabled = true;
  private _gongEnabled = true;

  constructor() {
    this.drone = new DroneEngine();
    this.melody = new MelodyEngine();
    this.gong = new GongEngine();
  }

  /**
   * Initialize the audio context and all engines
   * MUST be called from a user gesture (click/tap)
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      // Start the Tone.js audio context
      await Tone.start();
      console.log('🔊 AudioContext started');

      // Initialize sub-engines in parallel
      await Promise.all([
        this.drone.initialize(),
        this.melody.initialize(),
        this.gong.initialize(),
      ]);

      this._isInitialized = true;
      console.log('🔊 AudioEngine fully initialized');
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }

  /**
   * Start the ambient soundscape
   */
  start(): void {
    if (!this._isInitialized) {
      console.warn('AudioEngine not initialized. Call initialize() first.');
      return;
    }

    if (this._droneEnabled) {
      this.drone.start();
    }
    this.applyVolume();
  }

  /**
   * Stop all audio
   */
  stop(): void {
    this.drone.stop();
  }

  /**
   * Update audio based on network stress level
   * @param stressLevel - 0.0 (calm) to 1.0 (congested)
   */
  setStressLevel(stressLevel: number): void {
    this.drone.setStressLevel(stressLevel);
    this.melody.setStressLevel(stressLevel);
  }

  /**
   * Trigger a melody from a transaction
   * Returns the melody event if triggered, null if skipped (cooldown/threshold)
   */
  triggerMelody(txid: string, value: number): MelodyEvent | null {
    if (!this._isInitialized || !this._melodyEnabled) return null;
    return this.melody.triggerMelody(txid, value);
  }

  /**
   * Trigger the "block mined" audio event
   * - Strikes the gong
   * - Applies filter sweep to drone
   * - Suppresses melodies temporarily
   */
  async triggerBlockEvent(): Promise<void> {
    if (!this._isInitialized) return;

    console.log('🔔 Block event triggered - striking gong!');

    // Strike the gong!
    if (this._gongEnabled) {
      this.gong.strike();
    }

    // Suppress melodies during the gong moment
    this.melody.suppress(4000);

    // Apply underwater filter sweep to drone (creates relief feeling)
    this.drone.applyFilterSweep(6);
  }

  /**
   * Test the gong sound (for debugging)
   */
  testGong(): void {
    if (this._isInitialized && this._gongEnabled) {
      this.gong.strike();
    }
  }

  /**
   * Set master volume (0-100)
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(100, volume));
    this.applyVolume();
  }

  private applyVolume(): void {
    // Convert 0-100 to a dB offset
    // At 100% = 0dB offset (original levels)
    // At 0% = -60dB offset (essentially silent)
    const normalizedVolume = this._volume / 100;
    const dbOffset = normalizedVolume === 0 ? -60 : -60 * (1 - normalizedVolume);
    
    // Apply volume offset to each engine's base volume
    // Drone base: -24dB, Melody base: -12dB, Gong base: -6dB
    this.drone.setVolume(-24 + dbOffset);
    this.melody.setVolume(-12 + dbOffset);
    this.gong.setVolume(-6 + dbOffset);
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    Tone.getDestination().mute = this._isMuted;
    return this._isMuted;
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    Tone.getDestination().mute = this._isMuted;
  }

  /**
   * Toggle drone on/off
   */
  toggleDrone(): boolean {
    this._droneEnabled = !this._droneEnabled;
    if (this._droneEnabled) {
      this.drone.start();
    } else {
      this.drone.stop();
    }
    return this._droneEnabled;
  }

  setDroneEnabled(enabled: boolean): void {
    this._droneEnabled = enabled;
    if (enabled && this._isInitialized) {
      this.drone.start();
    } else {
      this.drone.stop();
    }
  }

  /**
   * Toggle melody on/off
   */
  toggleMelody(): boolean {
    this._melodyEnabled = !this._melodyEnabled;
    this.melody.setEnabled(this._melodyEnabled);
    return this._melodyEnabled;
  }

  setMelodyEnabled(enabled: boolean): void {
    this._melodyEnabled = enabled;
    this.melody.setEnabled(enabled);
  }

  /**
   * Toggle gong on/off
   */
  toggleGong(): boolean {
    this._gongEnabled = !this._gongEnabled;
    this.gong.setEnabled(this._gongEnabled);
    return this._gongEnabled;
  }

  setGongEnabled(enabled: boolean): void {
    this._gongEnabled = enabled;
    this.gong.setEnabled(enabled);
  }

  /**
   * Get recent melody events for visualization
   */
  getRecentMelodies(): MelodyEvent[] {
    return this.melody.getRecentMelodies();
  }

  /**
   * Get current state
   */
  getState(): AudioEngineState {
    return {
      isInitialized: this._isInitialized,
      isPlaying: this.drone.getIsPlaying(),
      isMuted: this._isMuted,
      volume: this._volume,
      droneEnabled: this._droneEnabled,
      melodyEnabled: this._melodyEnabled,
      gongEnabled: this._gongEnabled,
    };
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isPlaying(): boolean {
    return this.drone.getIsPlaying();
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get volume(): number {
    return this._volume;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.drone.dispose();
    this.melody.dispose();
    this.gong.dispose();
    this._isInitialized = false;
  }
}

// Singleton instance for global access
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}
