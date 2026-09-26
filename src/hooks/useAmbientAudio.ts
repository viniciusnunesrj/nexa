import { useEffect } from 'react';
import { soundService } from '../services/soundService';
import type { AmbientTrack } from '../services/ambientAudio';

export function useAmbientAudio(track: AmbientTrack, active: boolean) {
  useEffect(() => {
    if (active) return soundService.acquireAmbient(track);
  }, [track, active]);
}
