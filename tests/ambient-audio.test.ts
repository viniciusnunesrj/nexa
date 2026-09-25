import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientAudio, AMBIENT_VOLUME, prepareAmbientLoop } from '../src/services/ambientAudio';

class BufferMock {
  numberOfChannels = 1; sampleRate = 100; length = 1000; duration = 10;
  data = new Float32Array(1000).fill(.1);
  getChannelData() { return this.data; }
}
function fixture() {
  const nodes: { loop: boolean; offset: number; stopped: boolean }[] = [];
  const ctx = {
    state: 'running', currentTime: 0,
    addEventListener() {}, removeEventListener() {},
    createBuffer(channels: number, length: number, rate: number) {
      return Object.assign(new BufferMock(), { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate, data: new Float32Array(length) });
    },
    async decodeAudioData() { return new BufferMock(); },
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime(value: number) { assert.equal(value, AMBIENT_VOLUME); } }, connect() {}, disconnect() {} }; },
    createBufferSource() {
      const node = { loop: false, offset: 0, stopped: false, connect() {}, disconnect() {}, start(_: number, offset: number) { node.offset = offset; nodes.push(node); }, stop() { node.stopped = true; } };
      return node;
    },
  };
  return { ctx: ctx as unknown as AudioContext, nodes };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('one ambient source, no autoplay/restart, mute/resume offset and game switch', async () => {
  let requests = 0, enabled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { requests++; return new Response(new Uint8Array([1])); };
  try {
    const { ctx, nodes } = fixture();
    const audio = new AmbientAudio(() => enabled);
    const leaveRift = audio.acquire('rift');
    await settle(); assert.equal(requests, 0, 'waits for legitimate unlock');
    audio.unlock(ctx, {} as AudioNode); await settle();
    assert.equal(nodes.length, 1); assert.equal(nodes[0].loop, true);
    audio.sync(); audio.unlock(ctx, {} as AudioNode); await settle();
    assert.equal(nodes.length, 1, 'turns/renders/interactions do not restart');
    Object.assign(ctx, { currentTime: 3 }); enabled = false; audio.sync();
    assert.equal(nodes[0].stopped, true);
    enabled = true; audio.sync(); await settle();
    assert.equal(nodes[1].offset, 3, 'mute resumes at the same position');
    assert.equal(requests, 1, 'decoded buffer cached');
    const leaveDuel = audio.acquire('duel'); leaveRift(); await settle();
    assert.equal(nodes[1].stopped, true);
    assert.equal(nodes.filter(n => !n.stopped).length, 1);
    leaveDuel(); assert.equal(nodes.every(n => n.stopped), true);
    audio.sync(); await settle(); assert.equal(nodes.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test('late downloads and failed files cannot start audio after leaving', async () => {
  const originalFetch = globalThis.fetch;
  let resolve!: (response: unknown) => void;
  globalThis.fetch = (() => new Promise(done => { resolve = done; })) as typeof fetch;
  try {
    const { ctx, nodes } = fixture(); const audio = new AmbientAudio(() => true);
    audio.unlock(ctx, {} as AudioNode);
    const leave = audio.acquire('rift'); leave();
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }); await settle();
    assert.equal(nodes.length, 0);
    globalThis.fetch = (async () => { throw Error('offline'); }) as typeof fetch;
    audio.acquire('duel'); await settle(); assert.equal(nodes.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('crossfade is baked into a single buffer and preserves SFX headroom', () => {
  const { ctx } = fixture(); const input = new BufferMock();
  input.data.fill(1); input.data.fill(-1, 975);
  const output = prepareAmbientLoop(ctx, input as unknown as AudioBuffer);
  const samples = output.getChannelData(0);
  assert.equal(output.length, 975);
  assert.ok(Math.abs(samples[0] - samples.at(-1)!) < .00001, 'loop seam is continuous');
  for (const value of samples) assert.ok(Math.abs(value) <= .200001);
  assert.equal(AMBIENT_VOLUME, .2);
});
