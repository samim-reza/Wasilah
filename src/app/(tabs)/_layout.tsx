/**
 * The main tab bar.
 *
 * Four destinations, matching the four things the app is for: today's reading,
 * the Quran itself, how it is going, and settings. A fifth would dilute the
 * first.
 */
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

interface TabConfig {
  name: string;
  labelKey: string;
  icon: IconName;
  activeIcon: IconName;
}

const tabs: TabConfig[] = [
  { name: 'home', labelKey: 'tabs.home', icon: 'home', activeIcon: 'homeActive' },
  { name: 'quran', labelKey: 'tabs.quran', icon: 'quran', activeIcon: 'quranActive' },
  { name: 'progress', labelKey: 'tabs.progress', icon: 'progress', activeIcon: 'progressActive' },
  { name: 'profile', labelKey: 'tabs.profile', icon: 'profile', activeIcon: 'profileActive' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(tab.labelKey),
              tabBarIcon: ({ focused, size }) => (
                <Icon
                  name={focused ? tab.activeIcon : tab.icon}
                  size={size}
                  color={focused ? 'primary' : 'textSubtle'}
                />
              ),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}
