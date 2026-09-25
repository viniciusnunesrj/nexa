import { useEffect } from 'react';
import { soundService } from '../services/soundService';
import type { SfxName } from '../services/sfxPalette';

/** A cue belongs to a visible presentation event, never to game resolution or a timer. */
export function useSfxCue(cue: SfxName | undefined, eventId: string) {
  useEffect(() => {
    if (!cue || document.visibilityState === 'hidden') return;
    const scheduledAt = performance.now();
    const frame = requestAnimationFrame(() => {
      // A background tab or stalled frame must not replay an old impact on return.
      if (document.visibilityState !== 'hidden' && performance.now() - scheduledAt < 200) soundService.playSfx(cue, eventId);
    });
    return () => cancelAnimationFrame(frame);
  }, [cue, eventId]);
}
