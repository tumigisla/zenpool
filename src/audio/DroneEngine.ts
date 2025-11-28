import * as Tone from 'tone';

/**
 * DroneEngine - Creates wavy, oceanic ambient synth textures
 * 
 * The background is always flowing, like waves on water:
 * - Slow, evolving pad layers
 * - Subtle tremolo for movement
 * - Filters that breathe with the network stress
 * 
 * Low stress = spacious, underwater, ethereal
 * High stress = fuller, more harmonic presence
 */

// Root note and intervals for ambient pad (open voicing)
const PAD_NOTES = ['C2', 'G2', 'D3', 'A3'];

// Modulation ranges based on stress level (0-1)
const MODULATION_PARAMS = {
  filterFreq: { min: 250, max: 2000 },
  reverbWet: { min: 0.75, max: 0.4 },
  tremoloDepth: { min: 0.1, max: 0.4 },
  volume: { min: -28, max: -16 },
};

export class DroneEngine {
  private padSynth: Tone.PolySynth<Tone.Synth> | null = null;
  private subSynth: Tone.Synth | null = null;
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  private tremolo: Tone.Tremolo | null = null;
  private volume: Tone.Volume | null = null;
  private isPlaying = false;
  private currentStress = 0;

  async initialize(): Promise<void> {
    // Create effects chain
    this.volume = new Tone.Volume(-24);
    
    this.reverb = new Tone.Reverb({
      decay: 10,
      wet: 0.75,
      preDelay: 0.2,
    });
    await this.reverb.generate();

    // Tremolo for subtle movement (instead of LFO modulating filter)
    this.tremolo = new Tone.Tremolo({
      frequency: 0.08,
      depth: 0.2,
      type: 'sine',
      spread: 180,
    });

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 400,
      rolloff: -24,
      Q: 0.7,
    });

    // Main pad synth - simple sine waves with slow attack for smoothness
    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 6,
        decay: 4,
        sustain: 0.8,
        release: 10,
      },
    });

    // Sub bass synth for depth (very low, subtle)
    this.subSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 8,
        decay: 2,
        sustain: 0.9,
        release: 12,
      },
    });

    // Chain: synths -> filter -> tremolo -> reverb -> volume -> output
    this.padSynth.chain(this.filter, this.tremolo, this.reverb, this.volume, Tone.getDestination());
    
    // Sub bass goes direct to reverb (bypass tremolo for cleaner low end)
    this.subSynth.chain(this.reverb, this.volume, Tone.getDestination());

    console.log('🌊 DroneEngine initialized');
  }

  start(): void {
    if (!this.padSynth || !this.subSynth || this.isPlaying) return;

    // Start the tremolo for wave-like movement
    this.tremolo?.start();

    // Trigger the ambient pad notes with very low velocity
    this.padSynth.triggerAttack(PAD_NOTES, Tone.now(), 0.12);
    
    // Sub bass drone on root
    this.subSynth.triggerAttack('C1', Tone.now(), 0.15);

    this.isPlaying = true;
    console.log('🌊 Drone waves started');
  }

  stop(): void {
    if (!this.padSynth || !this.subSynth || !this.isPlaying) return;

    this.tremolo?.stop();
    this.padSynth.triggerRelease(PAD_NOTES, Tone.now());
    this.subSynth.triggerRelease(Tone.now());
    
    this.isPlaying = false;
    console.log('🌊 Drone waves stopped');
  }

  /**
   * Update the drone's character based on network stress level
   * @param stressLevel - 0.0 (calm) to 1.0 (congested)
   */
  setStressLevel(stressLevel: number): void {
    if (!this.filter || !this.reverb || !this.volume || !this.tremolo) return;
    
    this.currentStress = Math.max(0, Math.min(1, stressLevel));
    const t = this.currentStress;
    const now = Tone.now();

    // Interpolate parameters based on stress
    const lerp = (min: number, max: number, factor: number) => min + (max - min) * factor;

    // Get target values
    const targetFilterFreq = lerp(MODULATION_PARAMS.filterFreq.min, MODULATION_PARAMS.filterFreq.max, t);
    const targetReverbWet = lerp(MODULATION_PARAMS.reverbWet.min, MODULATION_PARAMS.reverbWet.max, t);
    const targetTremoloDepth = lerp(MODULATION_PARAMS.tremoloDepth.min, MODULATION_PARAMS.tremoloDepth.max, t);
    const targetVolume = lerp(MODULATION_PARAMS.volume.min, MODULATION_PARAMS.volume.max, t);

    // Apply with smooth ramping
    const rampTime = 0.8;

    this.filter.frequency.rampTo(targetFilterFreq, rampTime, now);
    this.reverb.wet.rampTo(targetReverbWet, rampTime, now);
    this.tremolo.depth.value = targetTremoloDepth;
    this.volume.volume.rampTo(targetVolume, rampTime, now);

    // Also adjust tremolo rate based on stress (faster = more tense)
    const targetTremoloRate = 0.05 + t * 0.15; // 0.05 to 0.20 Hz
    this.tremolo.frequency.rampTo(targetTremoloRate, rampTime, now);
  }

  /**
   * Apply a filter sweep effect (used during block events)
   * Creates an "underwater" moment of release
   */
  async applyFilterSweep(durationSeconds: number = 6): Promise<void> {
    if (!this.filter) return;

    const now = Tone.now();
    
    // Sweep filter down to very low
    this.filter.frequency.rampTo(100, durationSeconds * 0.25, now);
    // Hold underwater
    this.filter.frequency.rampTo(120, durationSeconds * 0.4, now + durationSeconds * 0.25);
    // Sweep back up
    this.filter.frequency.rampTo(400 + this.currentStress * 600, durationSeconds * 0.35, now + durationSeconds * 0.65);
  }

  /**
   * Create a swell effect (crescendo then back)
   */
  async swell(durationSeconds: number = 4): Promise<void> {
    if (!this.volume) return;

    const currentVol = this.volume.volume.value;
    const now = Tone.now();

    // Swell up
    this.volume.volume.rampTo(currentVol + 6, durationSeconds * 0.4, now);
    // Back down
    this.volume.volume.rampTo(currentVol, durationSeconds * 0.6, now + durationSeconds * 0.4);
  }

  setVolume(db: number): void {
    if (this.volume) {
      this.volume.volume.value = db;
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
    this.padSynth?.dispose();
    this.subSynth?.dispose();
    this.filter?.dispose();
    this.tremolo?.dispose();
    this.reverb?.dispose();
    this.volume?.dispose();
    this.padSynth = null;
    this.subSynth = null;
    this.filter = null;
    this.tremolo = null;
    this.reverb = null;
    this.volume = null;
  }
}
