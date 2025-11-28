import * as Tone from 'tone';
import { DroneEngine } from './DroneEngine';
import { TransactionSoundEngine } from './TransactionSoundEngine';
import type { TransactionSoundEvent } from './TransactionSoundEngine';
import { SingingBowlEngine } from './SingingBowlEngine';

/**
 * AudioEngine - Main controller for all audio in ZenPool
 * 
 * Manages:
 * - Browser AudioContext initialization (requires user gesture)
 * - Drone engine (continuous ambient synth waves)
 * - Transaction sounds (every tx creates a scaled sound with entropy)
 * - Singing bowl (Tibetan bowl for block mined celebration)
 */

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0-100
  droneEnabled: boolean;
  transactionSoundsEnabled: boolean;
  bowlEnabled: boolean;
}

export class AudioEngine {
  private drone: DroneEngine;
  private transactionSounds: TransactionSoundEngine;
  private bowl: SingingBowlEngine;
  private _isInitialized = false;
  private _isMuted = false;
  private _volume = 70; // 0-100
  private _droneEnabled = true;
  private _transactionSoundsEnabled = true;
  private _bowlEnabled = true;

  constructor() {
    this.drone = new DroneEngine();
    this.transactionSounds = new TransactionSoundEngine();
    this.bowl = new SingingBowlEngine();
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
        this.transactionSounds.initialize(),
        this.bowl.initialize(),
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
    this.transactionSounds.setStressLevel(stressLevel);
  }

  /**
   * Trigger a sound for a transaction
   * Now handles ALL transactions (not just whales)
   * Returns the sound event if triggered, null if skipped (cooldown/dust)
   */
  triggerTransactionSound(txid: string, value: number): TransactionSoundEvent | null {
    if (!this._isInitialized || !this._transactionSoundsEnabled) return null;
    return this.transactionSounds.triggerSound(txid, value);
  }

  /**
   * Trigger the "block mined" audio event
   * - Strikes the singing bowl
   * - Applies filter sweep to drone
   * - Suppresses transaction sounds temporarily
   */
  async triggerBlockEvent(): Promise<void> {
    if (!this._isInitialized) return;

    console.log('🔔 Block event triggered - striking singing bowl!');

    // Strike the singing bowl!
    if (this._bowlEnabled) {
      this.bowl.strike();
    }

    // Suppress transaction sounds during the bowl moment
    this.transactionSounds.suppress(4000);

    // Apply underwater filter sweep to drone (creates relief feeling)
    this.drone.applyFilterSweep(6);
  }

  /**
   * Test the singing bowl sound
   */
  testBowl(): void {
    if (this._isInitialized && this._bowlEnabled) {
      this.bowl.strike();
    }
  }

  /**
   * Gentle bowl strike
   */
  testBowlGentle(): void {
    if (this._isInitialized && this._bowlEnabled) {
      this.bowl.strikeGentle();
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
    // Drone base: -24dB, Transaction sounds base: -12dB, Bowl base: -6dB
    this.drone.setVolume(-24 + dbOffset);
    this.transactionSounds.setVolume(-12 + dbOffset);
    this.bowl.setVolume(-6 + dbOffset);
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
   * Toggle transaction sounds on/off
   */
  toggleTransactionSounds(): boolean {
    this._transactionSoundsEnabled = !this._transactionSoundsEnabled;
    this.transactionSounds.setEnabled(this._transactionSoundsEnabled);
    return this._transactionSoundsEnabled;
  }

  setTransactionSoundsEnabled(enabled: boolean): void {
    this._transactionSoundsEnabled = enabled;
    this.transactionSounds.setEnabled(enabled);
  }

  /**
   * Toggle bowl on/off
   */
  toggleBowl(): boolean {
    this._bowlEnabled = !this._bowlEnabled;
    this.bowl.setEnabled(this._bowlEnabled);
    return this._bowlEnabled;
  }

  setBowlEnabled(enabled: boolean): void {
    this._bowlEnabled = enabled;
    this.bowl.setEnabled(enabled);
  }

  /**
   * Get recent transaction sound events for visualization
   */
  getRecentSounds(): TransactionSoundEvent[] {
    return this.transactionSounds.getRecentSounds();
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
      transactionSoundsEnabled: this._transactionSoundsEnabled,
      bowlEnabled: this._bowlEnabled,
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
    this.transactionSounds.dispose();
    this.bowl.dispose();
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
