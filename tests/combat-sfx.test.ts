import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundService, SOUND_PREFERENCE_KEY } from '../src/services/soundService';
import { SFX_PALETTE, synthesizeSfx } from '../src/services/sfxPalette';
import { riftCombatCue, duelCombatCue, pvpCombatCue } from '../src/services/combatSfx';

test('SFX cache, mute, persistence, deduplication, voice limit and audio failure', async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key,value) } });
  let buffers = 0, starts = 0, stops = 0;
  let broken = false;
  class Context {
    static last: Context;
    state = 'running'; currentTime = 1; sampleRate = 44100; destination = {};
    constructor() { Context.last = this; }
    createGain() { return { gain: { value: 1, setValueAtTime() {} }, connect() {} }; }
    createBuffer(_: number, length: number) { buffers++; return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start() { if(broken) throw Error('Blocked'); starts++; }, stop() { stops++; } }; }
    async resume() { throw Error('Gesture required'); }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Context } });
  const service = new SoundService();
  assert.equal(service.playSfx('attack','blocked'), false);
  service.unlock(); await Promise.resolve();
  assert.equal(buffers, Object.keys(SFX_PALETTE).length);
  assert.equal(service.playSfx('attack','blocked'), false, 'blocked events are never replayed late');
  assert.equal(service.playSfx('attack','a'), true);
  assert.equal(service.playSfx('attack','a'), false, 'rerender cannot replay an event');
  service.unlock(); await Promise.resolve(); assert.equal(buffers,10);
  service.playSfx('select'); service.playSfx('reveal'); service.playSfx('impact');
  assert.equal(stops,1, 'fourth voice replaces lower priority');
  service.enabled=false;
  assert.equal(storage.get(SOUND_PREFERENCE_KEY),'false');
  assert.equal(new SoundService().enabled,false, 'reload respects mute');
  assert.equal(service.playSfx('victory','muted-result'),false);
  service.enabled=true; assert.equal(new SoundService().enabled,true);
  assert.equal(service.playSfx('victory','muted-result'),false);
  Context.last.currentTime++;
  const before=starts;
  assert.equal(service.playSfx('victory','result'),true);
  assert.equal(service.playSfx('victory','result'),false);
  assert.equal(starts,before+1);
  broken=true; assert.equal(service.playSfx('defeat'),false);
  Context.last.state='suspended'; service.unlock(); await Promise.resolve();
  assert.equal(service.playSfx('impact'),false);
});

test('cues follow visible phases, including draws and KO', () => {
  assert.deepEqual(['PREPARE','ATTACK','IMPACT','RECOVER'].map(p=>riftCombatCue(p,true)), ['confirm','attack','impact','destroy']);
  assert.equal(riftCombatCue('IMPACT',false,false),'resolve');
  assert.equal(riftCombatCue('RECOVER',false),undefined);
  assert.deepEqual(['SELECT','LOCK','CPU','ENTER','REVEAL','CALC','VS','IMPACT','DAMAGE','RESULT','NEXT'].map(p=>duelCombatCue(p,3)), [undefined,'confirm',undefined,undefined,'reveal',undefined,undefined,'attack','impact',undefined,undefined]);
  assert.equal(duelCombatCue('DAMAGE',0),'resolve');
  assert.equal(duelCombatCue('IMPACT',0),undefined);
  assert.deepEqual([1,2,3,4,5,6,7].map(p=>pvpCombatCue(p,3)),[undefined,undefined,'reveal',undefined,'attack','impact',undefined]);
});

test('all generated effects are finite, short, fade out and have mixing headroom', () => {
  for(const name of Object.keys(SFX_PALETTE) as (keyof typeof SFX_PALETTE)[]) {
    const samples=synthesizeSfx(name,48000);
    assert.ok(samples.length<=48000);
    assert.equal(samples[0],0);
    assert.ok(Math.abs(samples.at(-1)!)<.001);
    let peak=0;
    for(const value of samples) { assert.ok(Number.isFinite(value)); peak=Math.max(peak,Math.abs(value)); }
    assert.ok(peak>0 && peak<.16, name);
  }
});
