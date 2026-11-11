/**
 * FestiveAudio — entirely procedural Web Audio soundtrack & SFX.
 * No external audio files. A gentle "Bhoopali"-flavoured melody is
 * accompanied by a soft drone, tabla-like percussion and bells.
 */

type SfxName =
  | "jump" | "doubleJump" | "collect" | "laddoo" | "gift" | "hurt"
  | "checkpoint" | "locked" | "unlock" | "complete" | "gameover" | "victory" | "click";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class FestiveAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  musicEnabled = true;
  sfxEnabled = true;
  private musicVolume = 0.55;
  private sfxVolume = 0.8;

  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private musicRunning = false;
  private readonly tempo = 100;

  // D major / Bhoopali-flavoured 32-step phrase. 0 = rest.
  private readonly melody = [
    74, 76, 78, 81, 83, 81, 78, 76,
    74, 71, 69, 71, 74, 0, 76, 78,
    81, 83, 86, 83, 81, 78, 76, 74,
    71, 69, 71, 74, 76, 74, 71, 69,
  ];
  private readonly roots = [50, 50, 45, 45];

  get unlocked() { return this.ctx !== null; }

  /** Must be called after a user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(ctx.destination);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? this.musicVolume * 0.3 : 0;
      this.musicBus.connect(this.master);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.sfxEnabled ? this.sfxVolume * 0.65 : 0;
      this.sfxBus.connect(this.master);

      // Pre-render a small noise buffer for percussion / sparks.
      const len = Math.floor(ctx.sampleRate * 0.7);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.musicEnabled) this.startMusic();
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicBus.gain.linearRampToValueAtTime(on ? this.musicVolume * 0.3 : 0, this.ctx.currentTime + 0.2);
    }
    if (on && this.ctx) this.startMusic();
    if (!on) this.stopMusic();
  }

  setSfxEnabled(on: boolean) {
    this.sfxEnabled = on;
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.value = on ? this.sfxVolume * 0.65 : 0;
    }
  }

  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicBus && this.ctx && this.musicEnabled) {
      this.musicBus.gain.linearRampToValueAtTime(this.musicVolume * 0.3, this.ctx.currentTime + 0.15);
    }
  }

  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxBus && this.ctx && this.sfxEnabled) {
      this.sfxBus.gain.linearRampToValueAtTime(this.sfxVolume * 0.65, this.ctx.currentTime + 0.15);
    }
  }

  /* ------------------------------ music ------------------------------ */

  startMusic() {
    if (!this.ctx || !this.musicBus || this.musicRunning) {
      if (this.musicBus && this.ctx && this.musicEnabled) this.musicBus.gain.value = this.musicVolume * 0.3;
      return;
    }
    this.musicRunning = true;
    this.nextTime = this.ctx.currentTime + 0.12;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    if (!this.ctx || !this.musicRunning) return;
    const stepDur = 60 / this.tempo / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.35) {
      this.scheduleStep(this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % this.melody.length;
      this.nextTime += stepDur;
    }
  }

  private scheduleStep(step: number, when: number, dur: number) {
    if (!this.ctx) return;
    const note = this.melody[step];

    // Melody: soft plucked triangle with a sine octave shimmer.
    if (note) {
      this.note(midi(note), when, dur * 1.6, 0.075, "triangle");
      if (step % 4 === 0) this.note(midi(note + 12), when, dur * 0.9, 0.022, "sine");
    }

    // Gentle drone / low pulse at the start of each bar.
    if (step % 8 === 0) {
      const root = this.roots[Math.floor(step / 8) % this.roots.length];
      this.note(midi(root), when, dur * 7.4, 0.055, "sine");
      this.note(midi(root + 7), when + 0.04, dur * 7.2, 0.028, "triangle");
    }

    // Tabla-ish pattern: low "dha" and crisp high ticks.
    if (step % 4 === 0 || step % 8 === 6) this.tabla(when, step % 8 === 0);
    if (step % 2 === 1) this.tick(when + 0.01, 0.012);
    if (step === 0 || step === 16) this.bell(when, 0.03);
  }

  private note(freq: number, when: number, dur: number, gain: number, type: OscillatorType, slideTo?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.musicBus!);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private tabla(when: number, low: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(low ? 150 : 230, when);
    osc.frequency.exponentialRampToValueAtTime(low ? 64 : 140, when + 0.11);
    g.gain.setValueAtTime(0.09, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(g);
    g.connect(this.musicBus!);
    osc.start(when);
    osc.stop(when + 0.2);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = low ? 900 : 2400;
    bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.02, when + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    src.connect(bp); bp.connect(ng); ng.connect(this.musicBus!);
    src.start(when);
    src.stop(when + 0.08);
  }

  private tick(when: number, gain: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    src.connect(hp); hp.connect(g); g.connect(this.musicBus!);
    src.start(when);
    src.stop(when + 0.06);
  }

  private bell(when: number, gain: number) {
    this.note(midi(98), when, 1.1, gain, "sine");
    this.note(midi(105), when, 0.8, gain * 0.5, "sine");
  }

  /* ------------------------------- sfx ------------------------------- */

  sfx(name: SfxName) {
    if (!this.ctx || !this.sfxBus || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const tone = (f: number, d: number, g: number, type: OscillatorType = "triangle", slide?: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t + delay);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + delay + d);
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(g, t + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + d);
      osc.connect(gain); gain.connect(this.sfxBus!);
      osc.start(t + delay); osc.stop(t + delay + d + 0.03);
    };
    const noiseHit = (d: number, g: number, freq: number, delay = 0) => {
      if (!this.noise) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(g, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + d);
      src.connect(bp); bp.connect(gain); gain.connect(this.sfxBus!);
      src.start(t + delay); src.stop(t + delay + d + 0.02);
    };

    switch (name) {
      case "jump":
        tone(330, 0.13, 0.11, "triangle", 620);
        break;
      case "doubleJump":
        tone(520, 0.16, 0.09, "sine", 980);
        tone(780, 0.2, 0.045, "sine", 1240, 0.04);
        break;
      case "collect":
        tone(1046, 0.09, 0.09, "triangle");
        tone(1568, 0.14, 0.06, "sine", undefined, 0.07);
        break;
      case "laddoo":
        tone(660, 0.08, 0.08, "triangle");
        tone(880, 0.14, 0.06, "triangle", undefined, 0.06);
        break;
      case "gift":
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 0.07, "triangle", undefined, i * 0.07));
        noiseHit(0.18, 0.025, 7000, 0.05);
        break;
      case "hurt":
        tone(220, 0.26, 0.1, "sawtooth", 80);
        noiseHit(0.16, 0.05, 800);
        break;
      case "checkpoint":
        [523, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 0.075, "sine", undefined, i * 0.08));
        break;
      case "locked":
        tone(196, 0.12, 0.06, "square", 150);
        tone(160, 0.16, 0.05, "triangle", 120, 0.08);
        break;
      case "unlock":
        [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 0.08, "triangle", undefined, i * 0.06));
        break;
      case "complete":
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.36, 0.09, "triangle", undefined, i * 0.13));
        [0, 0.26, 0.52].forEach((d, i) => tone(midi(86 + i * 4), 0.5, 0.04, "sine", undefined, d));
        break;
      case "victory":
        [523, 587, 659, 784, 880, 1046, 1318, 1568].forEach((f, i) =>
          tone(f, 0.5, 0.085, i % 2 ? "sine" : "triangle", undefined, i * 0.14));
        noiseHit(0.6, 0.04, 5000, 0.1);
        break;
      case "gameover":
        [392, 349, 294, 220].forEach((f, i) => tone(f, 0.4, 0.08, "triangle", undefined, i * 0.18));
        break;
      case "click":
        tone(740, 0.055, 0.04, "triangle");
        break;
    }
  }

  destroy() {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
