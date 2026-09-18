/**
 * The app's icon vocabulary.
 *
 * Every icon used anywhere in Wasilah is named here. Components reference a
 * semantic name (`streak`, `bookmarkFilled`) rather than an icon-set glyph, so
 * the icon set can be swapped, or an individual icon replaced with custom
 * artwork, without touching a single screen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme/useTheme';
import type { ColorRole } from '@/theme/tokens';

/** Semantic name → Ionicons glyph. */
const iconMap = {
  home: 'home-outline',
  homeActive: 'home',
  quran: 'book-outline',
  quranActive: 'book',
  progress: 'stats-chart-outline',
  progressActive: 'stats-chart',
  profile: 'person-outline',
  profileActive: 'person',

  streak: 'flame',
  streakOutline: 'flame-outline',
  goal: 'flag-outline',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  trophy: 'trophy-outline',
  calendar: 'calendar-outline',
  clock: 'time-outline',

  play: 'play',
  pause: 'pause',
  skipNext: 'play-skip-forward',
  skipPrevious: 'play-skip-back',
  stop: 'stop',
  speed: 'speedometer-outline',
  volume: 'volume-medium-outline',

  bookmark: 'bookmark-outline',
  bookmarkFilled: 'bookmark',
  note: 'create-outline',
  share: 'share-social-outline',
  copy: 'copy-outline',
  collection: 'folder-outline',

  search: 'search',
  close: 'close',
  back: 'chevron-back',
  forward: 'chevron-forward',
  up: 'chevron-up',
  down: 'chevron-down',
  more: 'ellipsis-horizontal',
  add: 'add',
  remove: 'remove',
  filter: 'options-outline',

  settings: 'settings-outline',
  notifications: 'notifications-outline',
  notificationsOff: 'notifications-off-outline',
  theme: 'contrast-outline',
  language: 'language-outline',
  textSize: 'text-outline',
  location: 'location-outline',
  weather: 'partly-sunny-outline',
  prayer: 'moon-outline',
  sun: 'sunny-outline',

  offline: 'cloud-offline-outline',
  sync: 'sync-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  info: 'information-circle-outline',
  empty: 'file-tray-outline',
  signOut: 'log-out-outline',
  google: 'logo-google',
  apple: 'logo-apple',
  mail: 'mail-outline',
  lock: 'lock-closed-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  name: IconName;
  size?: number;
  /** A semantic colour role; defaults to the current text colour. */
  color?: ColorRole;
  /** Overrides `color` with a literal value, for icons over coloured surfaces. */
  tint?: string;
}

export function Icon({ name, size = 22, color = 'text', tint }: IconProps) {
  const { colors } = useTheme();

  return (
    <Ionicons
      name={iconMap[name]}
      size={size}
      color={tint ?? colors[color]}
      // Icons are decorative by default; the surrounding pressable or text
      // carries the accessible label.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
