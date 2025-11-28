import * as Tone from 'tone';

/**
 * SingingBowlEngine - Creates authentic Tibetan singing bowl sounds
 * 
 * When a new block is confirmed on the Bitcoin network, this triggers
 * a deep, resonant singing bowl that rings with overtones and slowly
 * decays, creating a meditative moment of release.
 * 
 * The sound is built from:
 * - Fundamental sine wave (the deep hum)
 * - Multiple harmonic partials (overtones)
 * - Subtle beating from detuned partials
 * - Long reverb tail
 */

// Tibetan bowl frequencies - based on real bowl measurements
// A typical bowl has a fundamental around 200-400Hz with specific harmonic ratios
const BOWL_HARMONICS = [
  { ratio: 1, gain: 1.0, decay: 15 },      // Fundamental
  { ratio: 2.71, gain: 0.6, decay: 12 },   // First harmonic (not exactly 3x)
  { ratio: 4.77, gain: 0.4, decay: 10 },   // Second harmonic
  { ratio: 7.52, gain: 0.25, decay: 8 },   // Third harmonic
  { ratio: 10.8, gain: 0.15, decay: 6 },   // Fourth harmonic
];

export class SingingBowlEngine {
  private synths: Tone.Synth[] = [];
  private reverb: Tone.Reverb | null = null;
  private volume: Tone.Volume | null = null;
  private filter: Tone.Filter | null = null;
  private isEnabled = true;

  // Base frequency - a nice resonant bowl pitch
  private baseFrequency = 220; // A3

  async initialize(): Promise<void> {
    // Large reverb for that temple atmosphere
    this.reverb = new Tone.Reverb({
      decay: 15,
      wet: 0.65,
      preDelay: 0.02,
    });
    await this.reverb.generate();

    // Gentle high-cut filter to soften the sound
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 4000,
      rolloff: -12,
      Q: 0.5,
    });

    this.volume = new Tone.Volume(-6);

    // Create synths for each harmonic
    BOWL_HARMONICS.forEach((harmonic) => {
      const synth = new Tone.Synth({
        oscillator: {
          type: 'sine',
        },
        envelope: {
          attack: 0.01,
          decay: harmonic.decay * 0.3,
          sustain: 0.4,
          release: harmonic.decay,
          attackCurve: 'exponential',
          releaseCurve: 'exponential',
        },
      });

      synth.chain(this.filter!, this.reverb!, this.volume!, Tone.getDestination());
      this.synths.push(synth);
    });

    console.log('🔔 SingingBowlEngine initialized');
  }

  /**
   * Strike the bowl!
   * Creates the layered harmonic sound of a singing bowl being struck
   */
  strike(intensity: number = 1): void {
    if (!this.isEnabled || this.synths.length === 0) return;

    const now = Tone.now();
    
    // Add slight randomization to make each strike unique
    const frequencyVariation = 1 + (Math.random() - 0.5) * 0.02; // ±1%
    const baseFreq = this.baseFrequency * frequencyVariation;

    // Strike each harmonic with slight timing offsets
    BOWL_HARMONICS.forEach((harmonic, index) => {
      const synth = this.synths[index];
      if (!synth) return;

      const frequency = baseFreq * harmonic.ratio;
      // Add subtle detuning for beating effect
      const detune = (Math.random() - 0.5) * 4; // ±2 cents
      
      const velocity = harmonic.gain * intensity * (0.9 + Math.random() * 0.2);
      const timeOffset = index * 0.003; // Slight stagger for realism

      // Set detune directly without ramping
      synth.detune.setValueAtTime(detune, now);
      synth.triggerAttackRelease(
        frequency,
        harmonic.decay * 0.8,
        now + timeOffset,
        Math.min(1, velocity)
      );
    });

    // Add a secondary, slightly delayed strike for the "wobble" effect
    setTimeout(() => {
      if (!this.isEnabled) return;
      
      const wobbleFreq = baseFreq * (1 + (Math.random() - 0.5) * 0.01);
      const fundamentalSynth = this.synths[0];
      if (fundamentalSynth) {
        fundamentalSynth.triggerAttackRelease(
          wobbleFreq,
          10,
          Tone.now(),
          0.2 * intensity
        );
      }
    }, 50);

    console.log('🔔 Singing bowl struck!');
  }

  /**
   * Gentle strike - for smaller events or testing
   */
  strikeGentle(): void {
    this.strike(0.4);
  }

  /**
   * Create a sustained singing effect (like rubbing the rim)
   */
  async sing(durationSeconds: number = 5): Promise<void> {
    if (!this.isEnabled || this.synths.length < 2) return;

    const now = Tone.now();
    const fundamentalSynth = this.synths[0];
    const harmonicSynth = this.synths[1];

    // Slowly fade in and out
    fundamentalSynth.triggerAttack(this.baseFrequency, now, 0.1);
    harmonicSynth.triggerAttack(this.baseFrequency * BOWL_HARMONICS[1].ratio, now + 0.5, 0.05);

    setTimeout(() => {
      fundamentalSynth.triggerRelease(Tone.now());
      harmonicSynth.triggerRelease(Tone.now());
    }, durationSeconds * 1000);
  }

  setVolume(db: number): void {
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  setBaseFrequency(freq: number): void {
    this.baseFrequency = Math.max(100, Math.min(500, freq));
  }

  dispose(): void {
    this.synths.forEach(synth => synth.dispose());
    this.synths = [];
    this.filter?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.filter = null;
    this.reverb = null;
    this.volume = null;
  }
}

