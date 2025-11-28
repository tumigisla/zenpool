import * as Tone from 'tone';

/**
 * TransactionSoundEngine - Every transaction creates a sound
 * 
 * Now with ADAPTIVE behavior for handling all mempool transactions:
 * - Dynamic volume scaling based on activity level
 * - Adaptive cooldown to prevent overwhelming noise
 * - Smart filtering - small txs become ambient texture, large ones stand out
 * - Max polyphony to prevent clipping
 * 
 * The sound characteristics scale with transaction size:
 * - Small txs: High pitched, quick, soft tinkles (like wind chimes)
 * - Medium txs: Mid-range bells, moderate sustain
 * - Large txs: Deep resonant tones, long sustain
 */

// Pentatonic scale for pleasant harmonies regardless of combination
const SCALE_FREQUENCIES = [
  // Low register (large transactions)
  130.81, 146.83, 164.81, 196.00, 220.00, // C3-A3
  // Mid register (medium transactions)
  261.63, 293.66, 329.63, 392.00, 440.00, // C4-A4
  // High register (small transactions)
  523.25, 587.33, 659.26, 783.99, 880.00, // C5-A5
  // Very high register (tiny transactions - sparkles)
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00, // C6-A6
];

// Transaction value thresholds (in satoshis)
const VALUE_THRESHOLDS = {
  DUST: 1_000,              // 0.00001 BTC - minimum for sound
  TINY: 10_000,             // 0.0001 BTC
  SMALL: 100_000,           // 0.001 BTC  
  MEDIUM: 1_000_000,        // 0.01 BTC
  LARGE: 10_000_000,        // 0.1 BTC
  WHALE: 100_000_000,       // 1 BTC
  MEGA: 1_000_000_000,      // 10 BTC
};

// Adaptive parameters - designed to let natural loudness reflect network activity
const ADAPTIVE_CONFIG = {
  // Activity measurement window (ms)
  activityWindow: 2000,
  // Max sounds per second before we start skipping tiny transactions
  maxSoundsPerSecond: 20,
  // Max concurrent sounds (to prevent clipping, not to reduce volume)
  maxPolyphony: 16,
  // Minimum cooldown between sounds (ms) - prevents audio glitches
  minCooldown: 30,
};

export interface TransactionSoundEvent {
  txid: string;
  value: number;
  frequency: number;
  duration: number;
  velocity: number;
  timestamp: number;
}

export class TransactionSoundEngine {
  private synth: Tone.PolySynth | null = null;
  private bellSynth: Tone.MetalSynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private filter: Tone.Filter | null = null;
  private volume: Tone.Volume | null = null;
  
  private isEnabled = true;
  private baseVolume = -12;
  private recentSounds: TransactionSoundEvent[] = [];
  private soundTimestamps: number[] = []; // For tracking activity
  private activeSounds = 0; // Track concurrent sounds
  private lastSoundTime = 0; // For cooldown

  async initialize(): Promise<void> {
    // Effects chain
    this.volume = new Tone.Volume(this.baseVolume);

    this.reverb = new Tone.Reverb({
      decay: 2.5,
      wet: 0.35,
      preDelay: 0.02,
    });
    await this.reverb.generate();

    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.15,
      wet: 0.12,
    });

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 5000,
      rolloff: -12,
    });

    // Main synth - increased polyphony for handling more transactions
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0.05,
        release: 1.0,
      },
    });
    this.synth.maxPolyphony = 24;

    // Metal synth for bell-like harmonics on larger txs
    this.bellSynth = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.3,
        release: 1.5,
      },
      harmonicity: 8.1,
      modulationIndex: 16,
      resonance: 3000,
      octaves: 1.5,
    });

    this.synth.chain(this.filter, this.delay, this.reverb, this.volume, Tone.getDestination());
    this.bellSynth.chain(this.reverb, this.volume, Tone.getDestination());

    console.log('✨ TransactionSoundEngine initialized (adaptive mode)');
  }

  /**
   * Get current activity level (sounds per second)
   */
  private getActivityLevel(): number {
    const now = Date.now();
    const windowStart = now - ADAPTIVE_CONFIG.activityWindow;
    
    // Clean old timestamps
    this.soundTimestamps = this.soundTimestamps.filter(t => t >= windowStart);
    
    // Calculate sounds per second
    return (this.soundTimestamps.length / ADAPTIVE_CONFIG.activityWindow) * 1000;
  }

  /**
   * Check if we should play this transaction
   * Only filters to prevent audio glitches - NOT to reduce volume
   * Natural accumulation of sounds = natural loudness reflecting network activity
   */
  private shouldPlaySound(value: number): boolean {
    const now = Date.now();
    
    // Minimum cooldown to prevent audio glitches
    if (now - this.lastSoundTime < ADAPTIVE_CONFIG.minCooldown) {
      // But always allow whales through
      if (value < VALUE_THRESHOLDS.WHALE) {
        return false;
      }
    }
    
    // Skip dust transactions
    if (value < VALUE_THRESHOLDS.DUST) {
      return false;
    }
    
    // Check polyphony limit to prevent clipping
    if (this.activeSounds >= ADAPTIVE_CONFIG.maxPolyphony) {
      // Only allow large transactions through when at max
      return value >= VALUE_THRESHOLDS.LARGE;
    }
    
    // When extremely busy, skip only the tiniest transactions to prevent chaos
    const activity = this.getActivityLevel();
    if (activity > ADAPTIVE_CONFIG.maxSoundsPerSecond && value < VALUE_THRESHOLDS.SMALL) {
      // Skip some tiny transactions, but not all
      return Math.random() > 0.5;
    }
    
    return true;
  }

  /**
   * Calculate normalized size (0-1) with logarithmic scaling
   */
  private normalizeValue(value: number): number {
    if (value < VALUE_THRESHOLDS.DUST) return 0;
    
    const minLog = Math.log(VALUE_THRESHOLDS.DUST);
    const maxLog = Math.log(VALUE_THRESHOLDS.MEGA);
    const valueLog = Math.log(Math.min(value, VALUE_THRESHOLDS.MEGA));
    
    return (valueLog - minLog) / (maxLog - minLog);
  }

  /**
   * Map transaction value to frequency with entropy
   */
  private getFrequency(normalizedValue: number, txid: string): number {
    // Base frequency from value (inverted: big = low, small = high)
    const invertedValue = 1 - normalizedValue;
    const baseIndex = Math.floor(invertedValue * (SCALE_FREQUENCIES.length - 1));
    
    // Add entropy from txid
    const hashEntropy = parseInt(txid.slice(-4), 16) / 0xFFFF;
    const variation = (hashEntropy - 0.5) * 2;
    
    // Allow moving ±2 notes with entropy
    const indexOffset = Math.round(variation * 2);
    const finalIndex = Math.max(0, Math.min(SCALE_FREQUENCIES.length - 1, baseIndex + indexOffset));
    
    const baseFreq = SCALE_FREQUENCIES[finalIndex];
    
    // Micro-detuning for organic feel (±5 cents)
    const detuneFactor = 1 + (Math.random() - 0.5) * 0.006;
    
    return baseFreq * detuneFactor;
  }

  /**
   * Get duration based on value (bigger = longer, but shorter overall for density)
   */
  private getDuration(normalizedValue: number): number {
    // Shorter durations to handle more transactions
    // Range from 0.1s (tiny) to 2s (whale)
    const baseDuration = 0.1 + normalizedValue * 1.9;
    // Add randomness (±20%)
    const variation = 1 + (Math.random() - 0.5) * 0.4;
    return baseDuration * variation;
  }

  /**
   * Get velocity (volume) based on transaction value
   * NO activity scaling - let natural accumulation create loudness
   */
  private getVelocity(normalizedValue: number): number {
    // Base velocity from 0.2 (tiny) to 0.9 (whale)
    // Larger transactions = louder individual sounds
    const baseVelocity = 0.2 + normalizedValue * 0.7;
    
    // Add randomness (±15%) for organic feel
    const variation = 1 + (Math.random() - 0.5) * 0.3;
    
    return Math.min(1, baseVelocity * variation);
  }

  /**
   * Trigger a sound for a transaction
   * Volume is NOT reduced when busy - natural accumulation = natural loudness
   */
  triggerSound(txid: string, value: number): TransactionSoundEvent | null {
    if (!this.synth || !this.isEnabled) return null;

    // Only filter to prevent audio glitches, not to reduce volume
    if (!this.shouldPlaySound(value)) {
      return null;
    }

    this.lastSoundTime = Date.now();

    const normalizedValue = this.normalizeValue(value);
    const frequency = this.getFrequency(normalizedValue, txid);
    const duration = this.getDuration(normalizedValue);
    const velocity = this.getVelocity(normalizedValue);

    const toneNow = Tone.now();

    // Track active sounds
    this.activeSounds++;
    setTimeout(() => {
      this.activeSounds = Math.max(0, this.activeSounds - 1);
    }, duration * 1000);

    // Record timestamp for activity tracking
    this.soundTimestamps.push(Date.now());

    // Main crystalline tone
    this.synth.triggerAttackRelease(frequency, duration, toneNow, velocity);

    // For larger transactions, add bell harmonics
    if (value >= VALUE_THRESHOLDS.MEDIUM && this.bellSynth) {
      const bellVelocity = (normalizedValue - 0.3) * 0.4;
      if (bellVelocity > 0) {
        this.bellSynth.triggerAttackRelease('16n', toneNow + 0.01, Math.min(0.6, bellVelocity));
      }
    }

    // For whale transactions, add a secondary tone (octave below)
    if (value >= VALUE_THRESHOLDS.WHALE) {
      setTimeout(() => {
        if (this.synth && this.isEnabled) {
          this.synth.triggerAttackRelease(
            frequency / 2,
            duration * 1.2,
            Tone.now(),
            velocity * 0.5
          );
        }
      }, 80);
    }

    const event: TransactionSoundEvent = {
      txid,
      value,
      frequency,
      duration,
      velocity,
      timestamp: Date.now(),
    };

    // Track recent sounds (keep fewer for performance)
    this.recentSounds.push(event);
    if (this.recentSounds.length > 30) {
      this.recentSounds.shift();
    }

    // Log with emoji based on size (less verbose)
    if (value >= VALUE_THRESHOLDS.SMALL) {
      const emoji = value >= VALUE_THRESHOLDS.MEGA ? '💎' :
                    value >= VALUE_THRESHOLDS.WHALE ? '🐋' :
                    value >= VALUE_THRESHOLDS.LARGE ? '🔔' :
                    value >= VALUE_THRESHOLDS.MEDIUM ? '✨' : '·';
      
      console.log(`${emoji} ${(value / 100_000_000).toFixed(4)} BTC @ ${frequency.toFixed(0)}Hz`);
    }

    return event;
  }

  /**
   * Adjust filter based on stress level
   */
  setStressLevel(stressLevel: number): void {
    if (!this.filter) return;
    
    const filterFreq = 3000 + stressLevel * 5000;
    this.filter.frequency.rampTo(filterFreq, 0.5);
  }

  /**
   * Temporarily suppress sounds (e.g., during block events)
   */
  suppress(durationMs: number): void {
    this.isEnabled = false;
    setTimeout(() => {
      this.isEnabled = true;
    }, durationMs);
  }

  setVolume(db: number): void {
    this.baseVolume = db;
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getRecentSounds(): TransactionSoundEvent[] {
    return [...this.recentSounds];
  }

  /**
   * Get current activity stats
   */
  getActivityStats(): { soundsPerSecond: number; activeSounds: number } {
    return {
      soundsPerSecond: this.getActivityLevel(),
      activeSounds: this.activeSounds,
    };
  }

  dispose(): void {
    this.synth?.dispose();
    this.bellSynth?.dispose();
    this.filter?.dispose();
    this.delay?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.synth = null;
    this.bellSynth = null;
    this.filter = null;
    this.delay = null;
    this.reverb = null;
    this.volume = null;
  }
}
