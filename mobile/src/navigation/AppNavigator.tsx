import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  IconHome,
  IconCalendar,
  IconPlus,
  IconMessage,
  IconSettings,
  IconShieldLock,
  type IconProps,
} from '@tabler/icons-react-native';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CreateScreen } from '../screens/CreateScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AdminScreen } from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, React.FC<IconProps>> = {
  Home: IconHome,
  Calendar: IconCalendar,
  Create: IconPlus,
  Chat: IconMessage,
  Settings: IconSettings,
  Admin: IconShieldLock,
};

export function AppNavigator() {
  const { token, loading, user } = useAuth();
  const { isDark, colors: c } = useTheme();
  const isAdmin = user?.role === 'admin';

  if (loading) return null;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.onSurface,
      border: c.outline,
      notification: c.primary,
    },
  };

  if (!token) {
    return (
      <NavigationContainer theme={navTheme}>
        <LoginScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: c.surface, height: 44 },
          headerTitle: () => null,
          headerShadowVisible: false,
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.outline,
            height: 84,
            paddingBottom: 18,
            paddingTop: 10,
          },
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.onSurfaceMuted,
          tabBarIcon: ({ color }) => {
            const Icon = TAB_ICONS[route.name];
            return <Icon size={24} color={color} />;
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendario' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
        {isAdmin && (
          <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin', headerShown: true }} />
        )}
        <Tab.Screen name="Create" component={CreateScreen} options={{ title: 'Crear', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Stella', headerShown: true, tabBarHideOnKeyboard: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' }}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
