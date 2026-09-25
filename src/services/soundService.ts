import { SFX_PALETTE, synthesizeSfx, type SfxName } from './sfxPalette';

export const SOUND_PREFERENCE_KEY = 'nexa_sound_enabled_v1';

export class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private preference = this.readPreference();
  private listeners = new Set<() => void>();
  private buffers = new Map<SfxName, AudioBuffer>();
  private voices = new Map<AudioBufferSourceNode, number>();
  private events = new Set<string>();
  private lastPlayed = new Map<SfxName, number>();

  private readPreference() {
    try { return localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false'; } catch { return true; }
  }
  public get enabled() { return this.preference; }
  public set enabled(value: boolean) {
    this.preference = value;
    try { localStorage.setItem(SOUND_PREFERENCE_KEY, String(value)); } catch { /* Memory fallback. */ }
    this.applyMute();
    this.listeners.forEach(listener => listener());
  }
  public getSnapshot = () => this.enabled;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private applyMute() {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.enabled ? 1 : 0, this.ctx.currentTime);
    if (!this.enabled) {
      for (const voice of this.voices.keys()) { try { voice.stop(); } catch { /* Already ended. */ } }
      this.voices.clear();
    }
  }
  // Registered by the existing topbar. No autoplay or audio permission prompts.
  public listenForUnlock = () => {
    const interact = (event: Event) => { if (event.isTrusted) this.unlock(); };
    const storage = (event: StorageEvent) => {
      if (event.key !== SOUND_PREFERENCE_KEY && event.key !== null) return;
      this.preference = this.readPreference();
      this.applyMute();
      this.listeners.forEach(listener => listener());
    };
    window.addEventListener('pointerdown', interact, { capture: true, passive: true });
    window.addEventListener('touchend', interact, { capture: true, passive: true });
    window.addEventListener('keydown', interact, true);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('pointerdown', interact, true);
      window.removeEventListener('touchend', interact, true);
      window.removeEventListener('keydown', interact, true);
      window.removeEventListener('storage', storage);
    };
  };
  public unlock() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      // Cache once, outside the interaction handler; never wait for sound to advance the game.
      if (this.buffers.size === Object.keys(SFX_PALETTE).length) return;
      queueMicrotask(() => {
        try { for (const name of Object.keys(SFX_PALETTE) as SfxName[]) this.getBuffer(name); } catch { /* Audio is optional. */ }
      });
    } catch { /* Unsupported or blocked audio never reaches the UI. */ }
  }
  private getBuffer(name: SfxName) {
    if (!this.ctx) return null;
    if (!this.buffers.has(name)) {
      const samples = synthesizeSfx(name, this.ctx.sampleRate);
      const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(name, buffer);
    }
    return this.buffers.get(name)!;
  }
  public playSfx(name: SfxName, eventId?: string): boolean {
    if (eventId) {
      if (this.events.has(eventId)) return false;
      this.events.add(eventId);
      if (this.events.size > 512) this.events.delete(this.events.values().next().value!);
    }
    // Drop blocked/muted events instead of replaying them late after unlock.
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || !this.master) return false;
    try {
      const now = this.ctx.currentTime;
      if (now - (this.lastPlayed.get(name) ?? -Infinity) < (name === 'impact' ? .1 : .04)) return false;
      const priority = SFX_PALETTE[name].priority;
      if (priority >= 5) {
        for (const voice of this.voices.keys()) voice.stop();
        this.voices.clear();
      } else if (this.voices.size >= 3) {
        const lowest = [...this.voices.entries()].sort((a,b) => a[1]-b[1])[0];
        if (lowest[1] > priority) return false;
        lowest[0].stop();
        this.voices.delete(lowest[0]);
      }
      const buffer = this.getBuffer(name);
      if (!buffer) return false;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.master);
      source.onended = () => { this.voices.delete(source); source.disconnect(); };
      this.voices.set(source, priority);
      try { source.start(); } catch { this.voices.delete(source); source.disconnect(); return false; }
      this.lastPlayed.set(name, now);
      return true;
    } catch { return false; }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 1 : 0;
        this.master.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => { /* A later real interaction can retry. */ });
    }
  }

  public playClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio not supported or blocked
    }
  }

  public playLaser() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore audio error
    }
  }

  public playVictory() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.master!);
        osc.start(this.ctx!.currentTime + idx * 0.12);
        osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [587.33, 880]; // D5, A5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(this.master!);
        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  public playError() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }

  public playFusionCharge() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.3);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.3);
    } catch {
      // Ignore
    }
  }

  public playBoxSuspense() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 1.8);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1.6);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start();
      osc.stop(this.ctx.currentTime + 2.0);
    } catch {
      // Ignore
    }
  }

  public playBoxReveal(rarity?: string) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (rarity === 'Mítico' || rarity === 'Lendário') {
        this.playMythicDrop();
        return;
      }
      const chords = rarity === 'Épico'
        ? [392.00, 493.88, 587.33, 783.99] // G major chord bright
        : [329.63, 392.00, 493.88]; // Em / standard
      chords.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(this.master!);
        osc.start(this.ctx!.currentTime + i * 0.08);
        osc.stop(this.ctx!.currentTime + i * 0.08 + 0.8);
      });
    } catch {
      // Ignore
    }
  }

  public playMythicDrop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const chords = [440, 554.37, 659.25, 830.61, 1108.73];
      chords.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 1.8);
        osc.connect(gain);
        gain.connect(this.master!);
        osc.start();
        osc.stop(this.ctx!.currentTime + 1.8);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundService = new SoundService();
