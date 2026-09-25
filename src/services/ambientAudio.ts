export type AmbientTrack = 'rift' | 'duel';
export const AMBIENT_VOLUME = 0.2;
const TRACKS: Record<AmbientTrack, string> = {
  rift: '/audio/ambient/Urgent.mp3',
  duel: '/audio/ambient/Pulse.mp3',
};

// Bake a 250ms tail/head crossfade once. One looping source, no timers or
// overlapping players. Attenuate loud masters to leave the existing SFX above.
export function prepareAmbientLoop(ctx: AudioContext, input: AudioBuffer): AudioBuffer {
  const fade = Math.min(Math.round(input.sampleRate * .25), Math.floor(input.length / 4));
  const length = input.length - fade;
  const output = ctx.createBuffer(input.numberOfChannels, length, input.sampleRate);
  let peak = 0;
  for (let channel = 0; channel < input.numberOfChannels; channel++) {
    const source = input.getChannelData(channel);
    const target = output.getChannelData(channel);
    target.set(source.subarray(fade, length));
    for (let i = 0; i < fade; i++) {
      const mix = i / Math.max(1, fade - 1);
      target[length - fade + i] = source[length + i] * (1 - mix) + source[i] * mix;
    }
    for (const sample of target) peak = Math.max(peak, Math.abs(sample));
  }
  const trim = Math.min(1, .2 / (peak || 1));
  if (trim < 1) for (let channel = 0; channel < output.numberOfChannels; channel++) {
    const data = output.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= trim;
  }
  return output;
}

/** Ambient-only layer; uses the SFX service's context, output and preference. */
export class AmbientAudio {
  private ctx?: AudioContext;
  private output?: AudioNode;
  private track?: AmbientTrack;
  private owner?: symbol;
  private offset = 0;
  private playing?: { source: AudioBufferSourceNode; gain: GainNode; started: number; duration: number };
  private buffers = new Map<AmbientTrack, Promise<AudioBuffer>>();
  constructor(private readonly enabled: () => boolean) {}

  // Called only by the existing service's user-interaction unlock path.
  unlock(ctx: AudioContext, output: AudioNode) {
    if (this.ctx !== ctx) {
      this.ctx?.removeEventListener('statechange', this.sync);
      this.ctx = ctx;
      this.output = output;
      ctx.addEventListener?.('statechange', this.sync);
    }
    this.sync();
  }

  acquire(track: AmbientTrack): () => void {
    const owner = Symbol(track);
    this.owner = owner;
    if (this.track !== track) { this.pause(); this.offset = 0; }
    this.track = track;
    this.sync();
    return () => {
      if (this.owner !== owner) return;
      this.track = undefined;
      this.owner = undefined;
      this.pause();
      this.offset = 0;
    };
  }

  private pause() {
    if (!this.playing || !this.ctx) return;
    const { source, gain, started, duration } = this.playing;
    this.offset = (this.offset + this.ctx.currentTime - started) % duration;
    this.playing = undefined;
    try { source.stop(); } catch { /* Already stopped. */ }
    source.disconnect();
    gain.disconnect();
  }

  sync = () => {
    if (!this.enabled() || !this.track) { this.pause(); return; }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.output || this.playing) return;
    const track = this.track;
    const owner = this.owner;
    let pending = this.buffers.get(track);
    if (!pending) {
      pending = fetch(TRACKS[track])
        .then(response => { if (!response.ok) throw new Error('Ambient unavailable'); return response.arrayBuffer(); })
        .then(data => ctx.decodeAudioData(data))
        .then(buffer => prepareAmbientLoop(ctx, buffer))
        .catch(error => { this.buffers.delete(track); throw error; });
      this.buffers.set(track, pending);
    }
    void pending.then(buffer => {
      if (this.owner !== owner || this.track !== track || !this.enabled() || ctx.state !== 'running' || this.playing) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, ctx.currentTime + .08);
      source.connect(gain);
      gain.connect(this.output!);
      try { source.start(0, this.offset % buffer.duration); }
      catch { source.disconnect(); gain.disconnect(); return; }
      this.playing = { source, gain, started: ctx.currentTime, duration: buffer.duration };
    }).catch(() => { /* A later interaction can retry; gameplay never depends on audio. */ });
  };
}
