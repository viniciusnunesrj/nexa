// Original, procedural NEXA effects. No recordings, external URLs or third-party samples.
export const SFX_PALETTE = {
  select: { duration: .055, frequencies: [740], end: 520, volume: .055, priority: 0 },
  invest: { duration: .07, frequencies: [980], end: 1180, volume: .055, priority: 0 },
  confirm: { duration: .13, frequencies: [587, 880], end: 1, volume: .075, priority: 1 },
  reveal: { duration: .18, frequencies: [420], end: 1100, volume: .085, priority: 1 },
  attack: { duration: .16, frequencies: [540], end: 100, volume: .09, priority: 2 },
  impact: { duration: .17, frequencies: [110], end: 42, volume: .15, priority: 3 },
  resolve: { duration: .16, frequencies: [330, 440], end: 1, volume: .08, priority: 2 },
  destroy: { duration: .3, frequencies: [180], end: 35, volume: .12, priority: 4 },
  victory: { duration: .68, frequencies: [523, 659, 784, 1046], end: 1, volume: .13, priority: 5 },
  defeat: { duration: .6, frequencies: [392, 330, 262], end: 1, volume: .11, priority: 5 },
} as const;
export type SfxName = keyof typeof SFX_PALETTE;

export function synthesizeSfx(name: SfxName, sampleRate: number): Float32Array {
  const recipe = SFX_PALETTE[name];
  const samples = new Float32Array(Math.ceil(recipe.duration * sampleRate));
  const notes: readonly number[] = recipe.frequencies;
  const noteDuration = recipe.duration / notes.length;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const index = Math.min(notes.length - 1, Math.floor(t / noteDuration));
    const local = t - index * noteDuration;
    const frequency = notes[index];
    const sweep = notes.length === 1 ? (recipe.end - frequency) / recipe.duration : 0;
    const phase = 2 * Math.PI * (frequency * local + sweep * local * local / 2);
    const envelope = Math.min(1, local / .006) * Math.pow(Math.max(0, 1 - local / noteDuration), 2);
    samples[i] = recipe.volume * envelope * (Math.sin(phase) + .18 * Math.sin(phase * 2)) / 1.18;
  }
  return samples;
}
