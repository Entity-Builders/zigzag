import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Para Vos',
          tabBarIcon: ({ focused }) => <TabIcon emoji='⚡' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='my-tours'
        options={{
          title: 'Tours',
          tabBarIcon: ({ focused }) => <TabIcon emoji='🗺️' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon emoji='👤' focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    height: 88,
    paddingTop: spacing.xs,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});
