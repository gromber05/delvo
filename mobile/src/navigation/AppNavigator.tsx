import React from 'react';
import { Text } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CreateScreen } from '../screens/CreateScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: '⊙',
  Calendar: '▦',
  Create: '✚',
  Chat: '✉',
  Settings: '⚙',
};

export function AppNavigator() {
  const { token, loading } = useAuth();
  const { isDark, colors: c } = useTheme();

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
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.onSurface,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
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
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color, lineHeight: 26 }}>{TAB_ICONS[route.name]}</Text>
          ),
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendario' }} />
        <Tab.Screen name="Create" component={CreateScreen} options={{ title: 'Crear' }} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Stella' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
