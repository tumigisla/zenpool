import * as Tone from 'tone';

/**
 * GongEngine - Creates the satisfying "block mined" gong sound
 * 
 * When a new block is confirmed on the Bitcoin network, this triggers
 * a deep, resonant gong that decays over 15-20 seconds, creating a
 * moment of release and "clearing" of energy.
 */

export class GongEngine {
  private metalSynth: Tone.MetalSynth | null = null;
  private membraneSynth: Tone.MembraneSynth | null = null;
  private lowSynth: Tone.Synth | null = null;
  private reverb: Tone.Reverb | null = null;
  private volume: Tone.Volume | null = null;
  private isEnabled = true;

  async initialize(): Promise<void> {
    // Create a large reverb for the gong tail
    this.reverb = new Tone.Reverb({
      decay: 12,
      wet: 0.6,
      preDelay: 0.01,
    });
    await this.reverb.generate();

    this.volume = new Tone.Volume(-6);

    // Metal synth for the shimmery high harmonics
    this.metalSynth = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 1.5,
        release: 8,
      },
      harmonicity: 5.1,
      modulationIndex: 24,
      resonance: 2000,
      octaves: 1.2,
    });
    this.metalSynth.frequency.value = 80;

    // Membrane synth for the deep fundamental
    this.membraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0.2,
        release: 10,
        attackCurve: 'exponential',
      },
    });

    // Low sine wave for the sub-bass rumble
    this.lowSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 2,
        sustain: 0.3,
        release: 12,
      },
    });

    // Connect all to reverb -> volume -> output
    this.metalSynth.chain(this.reverb, this.volume, Tone.getDestination());
    this.membraneSynth.chain(this.reverb, this.volume, Tone.getDestination());
    this.lowSynth.chain(this.reverb, this.volume, Tone.getDestination());

    console.log('🔔 GongEngine initialized');
  }

  /**
   * Strike the gong!
   * Creates a layered sound with:
   * - Deep sub-bass fundamental
   * - Rich membrane body
   * - Shimmery metallic harmonics
   */
  strike(): void {
    if (!this.metalSynth || !this.membraneSynth || !this.lowSynth || !this.isEnabled) {
      return;
    }

    const now = Tone.now();

    // Layer 1: Sub-bass rumble (C1 = ~32Hz)
    this.lowSynth.triggerAttackRelease('C1', '8n', now, 0.8);

    // Layer 2: Membrane body (slightly delayed for impact)
    this.membraneSynth.triggerAttackRelease('C2', '2n', now + 0.01, 0.7);

    // Layer 3: Metallic shimmer (even more delayed)
    this.metalSynth.triggerAttackRelease('16n', now + 0.02, 0.5);

    // Additional sub-harmonic for extra depth
    setTimeout(() => {
      if (this.lowSynth) {
        this.lowSynth.triggerAttackRelease('G0', '4n', Tone.now(), 0.4);
      }
    }, 100);

    console.log('🔔 GONG! Block mined!');
  }

  /**
   * Gentle version for testing or quieter moments
   */
  strikeGentle(): void {
    if (!this.membraneSynth || !this.lowSynth || !this.isEnabled) {
      return;
    }

    const now = Tone.now();
    this.lowSynth.triggerAttackRelease('C2', '8n', now, 0.4);
    this.membraneSynth.triggerAttackRelease('C3', '4n', now + 0.01, 0.3);
  }

  setVolume(db: number): void {
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  dispose(): void {
    this.metalSynth?.dispose();
    this.membraneSynth?.dispose();
    this.lowSynth?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.metalSynth = null;
    this.membraneSynth = null;
    this.lowSynth = null;
    this.reverb = null;
    this.volume = null;
  }
}

