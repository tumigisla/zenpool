import * as Tone from 'tone';

/**
 * DroneEngine - Creates a continuous ambient pad that modulates based on network stress
 * 
 * The drone is always playing once started, representing the "living network".
 * Low stress = ethereal, spacious sound
 * High stress = tense, gritty sound
 */

// Chord: Cmaj9 (C, E, G, B, D)
const DRONE_NOTES = ['C2', 'E2', 'G2', 'B2', 'D3', 'G3'];

// Modulation ranges based on stress level (0-1)
const MODULATION_PARAMS = {
  harmonicity: { min: 0.5, max: 2.5 },
  modulationIndex: { min: 1, max: 12 },
  filterFreq: { min: 200, max: 1500 },
  reverbWet: { min: 0.7, max: 0.3 },
  volume: { min: -28, max: -18 },
};

export class DroneEngine {
  private synth: Tone.PolySynth<Tone.FMSynth> | null = null;
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  private volume: Tone.Volume | null = null;
  private isPlaying = false;
  private currentStress = 0;

  async initialize(): Promise<void> {
    // Create effects chain
    this.volume = new Tone.Volume(-24);
    
    this.reverb = new Tone.Reverb({
      decay: 6,
      wet: 0.7,
      preDelay: 0.1,
    });
    await this.reverb.generate();

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 400,
      rolloff: -24,
      Q: 1,
    });

    // Create the polyphonic FM synth for rich harmonic content
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1,
      modulationIndex: 3,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 4,
        decay: 2,
        sustain: 0.8,
        release: 8,
      },
      modulation: {
        type: 'sine',
      },
      modulationEnvelope: {
        attack: 2,
        decay: 1,
        sustain: 0.5,
        release: 4,
      },
    });

    // Connect the chain: synth -> filter -> reverb -> volume -> output
    this.synth.chain(this.filter, this.reverb, this.volume, Tone.getDestination());

    console.log('🎵 DroneEngine initialized');
  }

  start(): void {
    if (!this.synth || this.isPlaying) return;

    // Trigger the chord with infinite sustain (until we call stop)
    this.synth.triggerAttack(DRONE_NOTES, Tone.now(), 0.15);
    this.isPlaying = true;
    console.log('🎵 Drone started');
  }

  stop(): void {
    if (!this.synth || !this.isPlaying) return;

    this.synth.triggerRelease(DRONE_NOTES, Tone.now());
    this.isPlaying = false;
    console.log('🎵 Drone stopped');
  }

  /**
   * Update the drone's character based on network stress level
   * @param stressLevel - 0.0 (calm) to 1.0 (congested)
   */
  setStressLevel(stressLevel: number): void {
    if (!this.synth || !this.filter || !this.reverb || !this.volume) return;
    
    this.currentStress = Math.max(0, Math.min(1, stressLevel));
    const t = this.currentStress;
    const now = Tone.now();

    // Interpolate parameters based on stress
    const lerp = (min: number, max: number, factor: number) => min + (max - min) * factor;

    // Get target values
    const targetHarmonicity = lerp(MODULATION_PARAMS.harmonicity.min, MODULATION_PARAMS.harmonicity.max, t);
    const targetModIndex = lerp(MODULATION_PARAMS.modulationIndex.min, MODULATION_PARAMS.modulationIndex.max, t);
    const targetFilterFreq = lerp(MODULATION_PARAMS.filterFreq.min, MODULATION_PARAMS.filterFreq.max, t);
    const targetReverbWet = lerp(MODULATION_PARAMS.reverbWet.min, MODULATION_PARAMS.reverbWet.max, t);
    const targetVolume = lerp(MODULATION_PARAMS.volume.min, MODULATION_PARAMS.volume.max, t);

    // Apply with smooth ramping (0.5 second transition)
    const rampTime = 0.5;

    // Update synth parameters for all voices
    this.synth.set({
      harmonicity: targetHarmonicity,
      modulationIndex: targetModIndex,
    });

    // Ramp filter and effects
    this.filter.frequency.rampTo(targetFilterFreq, rampTime, now);
    this.reverb.wet.rampTo(targetReverbWet, rampTime, now);
    this.volume.volume.rampTo(targetVolume, rampTime, now);
  }

  /**
   * Apply a low-pass filter sweep (used during block events)
   * Creates an "underwater" effect
   */
  async applyFilterSweep(durationSeconds: number = 5): Promise<void> {
    if (!this.filter) return;

    const now = Tone.now();
    const originalFreq = this.filter.frequency.value;
    
    // Sweep down to 150Hz
    this.filter.frequency.rampTo(150, durationSeconds * 0.3, now);
    // Hold
    this.filter.frequency.rampTo(150, durationSeconds * 0.4, now + durationSeconds * 0.3);
    // Sweep back up
    this.filter.frequency.rampTo(originalFreq, durationSeconds * 0.3, now + durationSeconds * 0.7);
  }

  setVolume(db: number): void {
    if (this.volume) {
      this.volume.volume.rampTo(db, 0.1);
    }
  }

  mute(): void {
    if (this.volume) {
      this.volume.mute = true;
    }
  }

  unmute(): void {
    if (this.volume) {
      this.volume.mute = false;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    this.synth?.dispose();
    this.filter?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.synth = null;
    this.filter = null;
    this.reverb = null;
    this.volume = null;
  }
}

