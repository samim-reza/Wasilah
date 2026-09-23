/**
 * Playing a single word's recitation.
 *
 * Its own player, separate from the recitation queue. Tapping a word while a
 * surah is playing must not stop the surah — the word clip plays over it,
 * which is what Quran.com does and what a learner expects. Sharing the main
 * player would have meant the tap paused the recitation, and resuming it
 * afterwards at the right position is exactly the kind of thing that goes
 * subtly wrong.
 *
 * One player instance for the component's life, with `replace()` per tap
 * rather than a new player per clip: creating a native player is the slow
 * part, and a learner taps many words in a row.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/lib/monitoring/logger';

/**
 * The web bundle is rendered once at build time in Node, where there is no
 * audio stack to create a player against. Returning null there — rather than
 * throwing — is what lets the reader route export at all.
 */
function createPlayerIfPossible(): AudioPlayer | null {
  if (typeof window === 'undefined') return null;
  try {
    return createAudioPlayer(null);
  } catch (error) {
    logger.debug('wordAudio.playerUnavailable', { error });
    return null;
  }
}

export function useWordAudio(): (url: string) => void {
  const [player] = useState(createPlayerIfPossible);

  useEffect(() => {
    return () => {
      // Releases the native resources; without this a player leaks per
      // reader screen visited.
      try {
        player?.remove();
      } catch {
        // Already released, which is fine.
      }
    };
  }, [player]);

  return useCallback(
    (url: string) => {
      if (!player) return;
      try {
        player.replace({ uri: url });
        player.play();
      } catch (error) {
        // A clip that fails to play is a clip not heard. The meaning sheet
        // still opens, so the tap is never wasted.
        logger.debug('wordAudio.playFailed', { error });
      }
    },
    [player],
  );
}
