// Moves the existing topbar control into the mobile Duel's fullscreen layer.
// There is still only one button and one sound preference.
let host: HTMLDivElement | null = null;
const listeners = new Set<() => void>();
export const combatAudioHost = {
  getSnapshot: () => host,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  attach: (element: HTMLDivElement | null) => { host = element; listeners.forEach(listener => listener()); },
};

export function CombatAudioSlot() {
  return <div ref={combatAudioHost.attach} className="absolute z-50 [&_button]:h-[44px] [&_button]:w-[44px]" style={{ top: 'calc(env(safe-area-inset-top) + 48px)', left: 'max(8px, env(safe-area-inset-left))' }} />;
}
