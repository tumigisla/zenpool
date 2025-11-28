# Project: ZenPool

### *A Real-time Bitcoin Mempool Sonification Engine*

---

## 1. Project Context & Philosophy

**Product Goal:** Build a web application called **ZenPool**. It connects to the `mempool.space` WebSocket API to visualize and sonify Bitcoin transactions in real-time.

**The Vibe:** Unlike typical crypto apps, this is **not** about price, urgency, or trading. It is an ambient relaxation tool. It treats the blockchain as a digital force of nature—a global heartbeat monitor.

**Core Paradigm Shift:** We use a **"State Modulation"** model, not an "Event Trigger" model.

- ❌ *Transaction arrives → Play Note* (creates silence or chaos)
- ✅ *The stream of transactions modulates a continuous river of sound*

The Mempool is the "water" flowing into a lake. The Block is when the lake drains. You hear the **water flowing**, not just individual drops.

---

## 2. Core Mechanics

| Element | Audio | Visual | The Feeling |
|---------|-------|--------|-------------|
| **The Drone** | Continuous evolving chord/pad that shifts based on network stress | Background gradient shifts | The living network |
| **The Sparkles** | Melodic arpeggios derived from TX hash entropy | Particles falling like sand | Individual transactions |
| **The Container** | Subtle tension build as block fills | Square container filling with particles | Anticipation |
| **The Gong** | Deep resonant gong + filter sweep | Particles fuse, glow, fly away | Release / Cleansing |

---

## 3. Technical Stack

- **Framework:** React + Vite (TypeScript)
- **Audio Engine:** `Tone.js` (web-based synthesis and scheduling)
- **Data Source:** `wss://mempool.space/api/v1/ws`
- **Styling:** Tailwind CSS
- **Visuals:** HTML5 Canvas (particle system with physics)

---

## 4. Implementation Steps

---

### Step 1: Project Scaffold & WebSocket Connection

**Goal:** Initialize the app and establish a buffered connection to the mempool WebSocket that calculates network "flow rate."

**Deliverables:**
1. New React + Vite + TypeScript project
2. Tailwind CSS configured
3. Custom hook `useMempoolSocket` that:
   - Connects to `wss://mempool.space/api/v1/ws`
   - Subscribes to `{ action: 'want', data: ['live-2h-chart', 'stats'] }` and tracks transactions
   - Implements a `TransactionBuffer` queue
   - Calculates **Flow Rate** (vBytes/second) every 100ms
   - Normalizes to a "Network Stress Level" between 0.0 (calm) and 1.0 (congested)
4. Simple dark UI showing:
   - Connection status
   - Current flow rate
   - Network stress level as a number
   - Last 5 transaction IDs (to prove data is flowing)

**Technical Notes:**
- The mempool.space WebSocket sends transaction data via the `multi-address` tracking or `live-2h-chart`
- For transactions, we need to track: `txid`, `value` (satoshis), `vsize`, `fee`
- Buffer should retain last 5 seconds of transactions for flow calculation

---

### Step 2: The Continuous Drone (The River)

**Goal:** Create the ambient "bed" of sound that is always present—no silence.

**Deliverables:**
1. Install `tone` (Tone.js)
2. "Enter ZenPool" button to initialize AudioContext (browser requirement)
3. `DroneEngine` class/module that:
   - Creates a `Tone.PolySynth` with `FMSynth` or `AMSynth` voices
   - Plays a continuous chord (C Major 9: C3, E3, G3, B3, D4) that **never stops**
   - Wraps output in `Tone.Reverb` (large room, 3-5s decay)
4. **Modulation based on Network Stress Level:**
   - **Low Stress (0.0):** Low harmonicity, slow attack, wet reverb (ethereal)
   - **High Stress (1.0):** Higher harmonicity, slight filter distortion, drier reverb (tense)
5. Smooth interpolation between states (use `Tone.Signal` or manual ramping)

**Musical Parameters to Modulate:**
```
harmonicity: 0.5 → 3.0 (based on stress)
modulationIndex: 1 → 10
filterFrequency: 200Hz → 2000Hz
reverbWet: 0.8 → 0.3
volume: -20dB → -12dB
```

---

### Step 3: Entropy as Melody (The Sparkles)

**Goal:** Use transaction hash randomness to generate unique melodic motifs on top of the drone.

**Deliverables:**
1. `MelodyEngine` class/module that:
   - Monitors buffer for "Significant Transactions" (value > 0.01 BTC / 1,000,000 sats)
   - Creates a separate `Tone.PolySynth` with a brighter, plucky sound (Pluck or gentle FM)
2. **Hash-to-Melody Algorithm:**
   - Take last 8 characters of TXID (hexadecimal)
   - Convert each hex pair to integer (0-255)
   - Map to notes in Pentatonic scale (C, D, E, G, A across 2 octaves)
   - Play as 4-note arpeggio with slight delay between notes
3. **Value-to-Velocity Mapping:**
   - Small whales (0.01-0.1 BTC): Soft, high register
   - Medium whales (0.1-1 BTC): Medium, mid register
   - Large whales (1+ BTC): Loud, low register with longer sustain
4. **Throttling:** Maximum 1 melody per 500ms to prevent chaos

**Example Hash Mapping:**
```
TXID: ...a3f8b2c1
Last 8: a3f8b2c1
Pairs: a3=163, f8=248, b2=178, c1=193
Scale: C D E G A (5 notes × 2 octaves = 10 options)
Notes: 163%10=3→G4, 248%10=8→G5, 178%10=8→G5, 193%10=3→G4
Arpeggio: G4 → G5 → G5 → G4
```

---

### Step 4: The Candidate Block Visualizer

**Goal:** Show transactions accumulating in a visual "container" that represents the next block.

**Deliverables:**
1. `BlockVisualizer` component using HTML5 Canvas
2. Large faint square outline in center = "Candidate Block" container
3. **Particle System:**
   - Each transaction spawns N particles (N = vsize / 100, capped)
   - Particles fall from random X positions at top
   - Simple gravity physics with slight randomness
   - Particles accumulate inside the square (collision detection with bottom + pile)
4. **Particle Coloring by Fee Rate:**
   - < 5 sat/vB: Cool blue (#3B82F6)
   - 5-20 sat/vB: Teal (#14B8A6)
   - 20-50 sat/vB: Yellow (#EAB308)
   - 50-100 sat/vB: Orange (#F97316)
   - > 100 sat/vB: Red (#EF4444)
5. **Particle Size:** Based on transaction value (small: 2px, large: 8px)
6. Display current block height and estimated fullness percentage

**Performance Notes:**
- Use requestAnimationFrame for smooth 60fps
- Limit total particles to ~500, remove oldest when exceeded
- Use object pooling for particle recycling

---

### Step 5: The Gong (Block Mined Event)

**Goal:** Handle the dramatic transition when a new block is confirmed.

**Deliverables:**
1. Detect `block` message from WebSocket
2. **Audio Response:**
   - Trigger deep resonant Gong using `Tone.MetalSynth` or `Tone.MembraneSynth`
   - Frequency: ~60Hz, Decay: 15-20 seconds
   - Simultaneously apply Low-Pass Filter sweep to Drone (2000Hz → 200Hz → 2000Hz over 5s)
   - Creates "underwater" relief feeling
3. **Visual Response:**
   - All particles in container "fuse" together (move toward center)
   - Container glows bright white
   - Shrinks and flies into background (scale down + fade)
   - Display "Block #[HEIGHT] Mined" text briefly
   - New empty container fades in
4. **Silence Window:** Suppress new melody triggers for 3 seconds after gong

---

### Step 6: UI Polish & Controls

**Goal:** Add user controls and refined aesthetics.

**Deliverables:**
1. **Control Bar (bottom, minimal):**
   - Master Volume slider
   - Mute/Unmute toggle
   - Drone On/Off toggle
   - Melody On/Off toggle
2. **Stats Display (corner, dim):**
   - Current Block Height
   - Mempool Size (MB)
   - Median Fee Rate (sat/vB)
   - Transactions/second
3. **Visual Polish:**
   - Background: Deep charcoal gradient (#0a0a0a → #111111)
   - Particles: `mix-blend-mode: screen` for glow effect
   - Subtle vignette around edges
   - Typography: Monospace for numbers, clean sans for labels
4. **Responsive:** Works on desktop and tablet (mobile optional)

---

### Step 7: Session & State Persistence

**Goal:** Remember user preferences and provide session stats.

**Deliverables:**
1. LocalStorage persistence for:
   - Volume level
   - Toggle states (drone, melody, mute)
2. Session stats (shown on hover/click):
   - Blocks witnessed this session
   - Total transactions observed
   - Largest transaction seen
   - Session duration
3. Optional: "Full Screen" mode for ambient display

---

## 5. API Reference

### mempool.space WebSocket

**Connection:** `wss://mempool.space/api/v1/ws`

**Subscribe:**
```json
{ "action": "want", "data": ["blocks", "stats", "live-2h-chart"] }
```

**Key Message Types:**
```typescript
// New block mined
{
  "block": {
    "height": 812345,
    "hash": "000000000000000000...",
    "timestamp": 1699999999,
    "tx_count": 3500,
    "size": 1500000
  }
}

// Stats update
{
  "mempoolInfo": {
    "size": 150000,      // tx count
    "bytes": 85000000,   // total vbytes
    "usage": 95000000
  },
  "fees": {
    "fastestFee": 25,
    "halfHourFee": 20,
    "hourFee": 15,
    "economyFee": 10,
    "minimumFee": 5
  }
}
```

**For live transactions:** Track address or use `live-2h-chart` data which includes transaction flow metrics.

---

## 6. Audio Design Reference

### Scale: C Major Pentatonic (Safe/Consonant)
```
C3, D3, E3, G3, A3
C4, D4, E4, G4, A4
C5, D5, E5, G5, A5
```

### Drone Chord: Cmaj9
```
C3, E3, G3, B3, D4
```

### Synth Presets

**Drone (FM):**
```javascript
{
  harmonicity: 1.5,
  modulationIndex: 5,
  oscillator: { type: "sine" },
  envelope: { attack: 2, decay: 1, sustain: 0.8, release: 4 },
  modulation: { type: "sine" }
}
```

**Sparkle (Pluck):**
```javascript
{
  attackNoise: 1,
  dampening: 4000,
  resonance: 0.9,
  release: 1.5
}
```

**Gong (Metal):**
```javascript
{
  frequency: 60,
  envelope: { attack: 0.01, decay: 0.4, release: 20 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
}
```

---

## 7. File Structure (Suggested)

```
zenpool/
├── src/
│   ├── components/
│   │   ├── App.tsx
│   │   ├── EnterButton.tsx
│   │   ├── BlockVisualizer.tsx
│   │   ├── ControlBar.tsx
│   │   └── StatsDisplay.tsx
│   ├── hooks/
│   │   └── useMempoolSocket.ts
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── DroneEngine.ts
│   │   ├── MelodyEngine.ts
│   │   └── GongEngine.ts
│   ├── utils/
│   │   ├── hashToMelody.ts
│   │   ├── feeToColor.ts
│   │   └── normalization.ts
│   ├── types/
│   │   └── mempool.ts
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 8. Success Criteria

- [ ] Continuous ambient sound that responds to network activity
- [ ] No awkward silence during slow periods
- [ ] Unique melodic phrases generated from transaction entropy
- [ ] Visual particle system showing block formation
- [ ] Satisfying "gong" moment when block is mined
- [ ] Smooth performance (60fps visuals, no audio glitches)
- [ ] Intuitive controls for volume and toggles
- [ ] Works in Chrome, Firefox, Safari (desktop)

---

## 9. Future Enhancements (Out of Scope for V1)

- [ ] Multiple "biomes" / sound themes to choose from
- [ ] Lightning Network integration (faster, higher-pitched sounds)
- [ ] Mobile app (React Native with expo-av)
- [ ] Shareable "session recordings" 
- [ ] VR/AR mode
- [ ] Integration with hardware (MIDI out, smart lights)

---

*Begin with Step 1. Copy this entire document as context, then prompt with "Let's implement Step 1" and proceed sequentially.*

