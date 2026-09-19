/**
 * Choosing how far a recitation should run.
 *
 * Tapping play on an ayah used to always mean "this one, then stop", which is
 * the less common intent — most listening starts at an ayah and carries on.
 * Rather than guess, or bury the alternative behind a long-press nobody finds,
 * the two are offered plainly.
 *
 * Only shown when starting playback. Tapping the button on the ayah already
 * playing still just pauses, because asking a question there would be noise.
 */
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';

export type PlayScope = 'single' | 'continue';

export interface PlayScopeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (scope: PlayScope) => void;
}

export function PlayScopeSheet({ visible, onClose, onSelect }: PlayScopeSheetProps) {
  const choose = (scope: PlayScope) => {
    onSelect(scope);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Play" heightRatio={0.3}>
      <View>
        <ListRow
          label="This ayah only"
          hint="Play it once and stop"
          icon="play"
          onPress={() => choose('single')}
        />
        <ListRow
          label="From here onwards"
          hint="Continue through the surah"
          icon="skipNext"
          onPress={() => choose('continue')}
        />
      </View>
    </BottomSheet>
  );
}
