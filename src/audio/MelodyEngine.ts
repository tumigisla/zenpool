import * as Tone from 'tone';

/**
 * MelodyEngine - Generates unique melodies from transaction hash entropy
 * 
 * Each significant transaction (whale) triggers a unique 4-note arpeggio
 * derived from its TXID hash. This creates a generative soundscape where
 * every transaction has its own "signature melody."
 */

// Pentatonic scale across 3 octaves for always-pleasant harmonies
const SCALE_NOTES = [
  'C3', 'D3', 'E3', 'G3', 'A3',  // Octave 3
  'C4', 'D4', 'E4', 'G4', 'A4',  // Octave 4
  'C5', 'D5', 'E5', 'G5', 'A5',  // Octave 5
];

// Thresholds for "whale" transactions (in satoshis)
const THRESHOLDS = {
  SMALL_WHALE: 1_000_000,      // 0.01 BTC
  MEDIUM_WHALE: 10_000_000,    // 0.1 BTC
  LARGE_WHALE: 100_000_000,    // 1 BTC
  MEGA_WHALE: 1_000_000_000,   // 10 BTC
};

// Minimum time between melodies to prevent chaos (ms)
const MELODY_COOLDOWN = 800;

export interface MelodyEvent {
  txid: string;
  value: number;
  notes: string[];
  timestamp: number;
}

export class MelodyEngine {
  private synth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private filter: Tone.Filter | null = null;
  private volume: Tone.Volume | null = null;
  private lastMelodyTime = 0;
  private isEnabled = true;
  private recentMelodies: MelodyEvent[] = [];

  async initialize(): Promise<void> {
    // Create effects chain for sparkly, atmospheric sound
    this.volume = new Tone.Volume(-12);

    this.reverb = new Tone.Reverb({
      decay: 4,
      wet: 0.5,
      preDelay: 0.05,
    });
    await this.reverb.generate();

    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.25,
    });

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 3000,
      rolloff: -12,
    });

    // Create a plucky synth for melodic content
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.1,
        release: 1.5,
      },
    });

    // Chain: synth -> filter -> delay -> reverb -> volume -> output
    this.synth.chain(this.filter, this.delay, this.reverb, this.volume, Tone.getDestination());

    console.log('✨ MelodyEngine initialized');
  }

  /**
   * Convert a transaction hash to a 4-note melody
   * Uses last 8 hex characters as entropy source
   */
  private hashToMelody(txid: string): string[] {
    // Take last 8 characters of the hash
    const hashSegment = txid.slice(-8);
    const notes: string[] = [];

    // Convert pairs of hex chars to note indices
    for (let i = 0; i < 8; i += 2) {
      const hexPair = hashSegment.slice(i, i + 2);
      const value = parseInt(hexPair, 16); // 0-255
      const noteIndex = value % SCALE_NOTES.length;
      notes.push(SCALE_NOTES[noteIndex]);
    }

    return notes;
  }

  /**
   * Get velocity (volume) based on transaction value
   */
  private getVelocity(value: number): number {
    if (value >= THRESHOLDS.MEGA_WHALE) return 0.9;
    if (value >= THRESHOLDS.LARGE_WHALE) return 0.75;
    if (value >= THRESHOLDS.MEDIUM_WHALE) return 0.6;
    return 0.45;
  }

  /**
   * Get arpeggio timing based on transaction value
   * Larger = slower, more deliberate
   */
  private getArpeggioTiming(value: number): number {
    if (value >= THRESHOLDS.MEGA_WHALE) return 0.25;  // Slow, majestic
    if (value >= THRESHOLDS.LARGE_WHALE) return 0.18;
    if (value >= THRESHOLDS.MEDIUM_WHALE) return 0.12;
    return 0.08; // Quick sparkle
  }

  /**
   * Get octave shift based on transaction value
   * Smaller = higher pitch, Larger = lower pitch
   */
  private getOctaveShift(value: number): number {
    if (value >= THRESHOLDS.LARGE_WHALE) return -12; // One octave down
    if (value >= THRESHOLDS.MEDIUM_WHALE) return 0;
    return 12; // One octave up for small whales
  }

  /**
   * Trigger a melody for a transaction
   */
  triggerMelody(txid: string, value: number): MelodyEvent | null {
    if (!this.synth || !this.isEnabled) return null;

    const now = Date.now();
    
    // Check cooldown
    if (now - this.lastMelodyTime < MELODY_COOLDOWN) {
      return null;
    }

    // Only trigger for "whale" transactions
    if (value < THRESHOLDS.SMALL_WHALE) {
      return null;
    }

    this.lastMelodyTime = now;

    // Generate melody from hash
    const baseNotes = this.hashToMelody(txid);
    const velocity = this.getVelocity(value);
    const timing = this.getArpeggioTiming(value);
    const octaveShift = this.getOctaveShift(value);

    // Apply octave shift
    const notes = baseNotes.map(note => {
      const match = note.match(/([A-G]#?)(\d)/);
      if (!match) return note;
      const [, pitch, octave] = match;
      const newOctave = parseInt(octave) + Math.floor(octaveShift / 12);
      return `${pitch}${Math.max(2, Math.min(6, newOctave))}`;
    });

    // Schedule the arpeggio
    const toneNow = Tone.now();
    notes.forEach((note, index) => {
      const time = toneNow + index * timing;
      this.synth!.triggerAttackRelease(note, '4n', time, velocity);
    });

    // Log for visual feedback
    const whaleSize = value >= THRESHOLDS.MEGA_WHALE ? '🐋🐋🐋' :
                      value >= THRESHOLDS.LARGE_WHALE ? '🐋🐋' :
                      value >= THRESHOLDS.MEDIUM_WHALE ? '🐋' : '🐟';
    console.log(`${whaleSize} Melody: ${notes.join(' → ')} (${(value / 100_000_000).toFixed(4)} BTC)`);

    const event: MelodyEvent = {
      txid,
      value,
      notes,
      timestamp: now,
    };

    // Keep track of recent melodies
    this.recentMelodies.push(event);
    if (this.recentMelodies.length > 10) {
      this.recentMelodies.shift();
    }

    return event;
  }

  /**
   * Set overall stress level to adjust melody brightness
   */
  setStressLevel(stressLevel: number): void {
    if (!this.filter) return;

    // Higher stress = brighter, more present melodies
    const filterFreq = 2000 + stressLevel * 4000;
    this.filter.frequency.rampTo(filterFreq, 0.5);
  }

  /**
   * Temporarily suppress melodies (e.g., during block events)
   */
  suppress(durationMs: number): void {
    this.isEnabled = false;
    setTimeout(() => {
      this.isEnabled = true;
    }, durationMs);
  }

  setVolume(db: number): void {
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getRecentMelodies(): MelodyEvent[] {
    return [...this.recentMelodies];
  }

  dispose(): void {
    this.synth?.dispose();
    this.filter?.dispose();
    this.delay?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.synth = null;
    this.filter = null;
    this.delay = null;
    this.reverb = null;
    this.volume = null;
  }
}

