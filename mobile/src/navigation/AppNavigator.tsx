import React, { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import {
  IconHome,
  IconClipboardList,
  IconRobot,
  IconUser,
  IconShieldLock,
  type IconProps,
} from '@tabler/icons-react-native';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CreateScreen } from '../screens/CreateScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { AdminScreen } from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, React.FC<IconProps>> = {
  Home: IconHome,
  Tasks: IconClipboardList,
  Stella: IconRobot,
  Settings: IconUser,
  Admin: IconShieldLock,
};

export function AppNavigator() {
  const { token, loading, user } = useAuth();
  const { isDark, colors: c } = useTheme();
  const isAdmin = user?.role === 'admin';
  const navigationRef = useRef<NavigationContainerRef<Record<string, undefined>>>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { type?: string };
      const nav = navigationRef.current;
      if (!nav) return;
      if (data?.type === 'stella') {
        nav.navigate('Stella');
      } else if (data?.type === 'task' || data?.type === 'meeting') {
        nav.navigate('Tasks');
      } else if (data?.type === 'event') {
        nav.navigate('Home');
      }
    });
    return () => sub.remove();
  }, []);

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
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <LoginScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
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
            return Icon ? <Icon size={24} color={color} /> : null;
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2, fontFamily: 'Arimo' },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio', tabBarLabel: 'Inicio' }} />
        <Tab.Screen name="Tasks" component={PlannerScreen} options={{ title: 'Tareas', tabBarLabel: 'Tareas' }} />
        <Tab.Screen name="Stella" component={ChatScreen} options={{ title: 'Stella', tabBarLabel: 'Stella' }} />
        {isAdmin && (
          <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin', tabBarLabel: 'Admin' }} />
        )}
        <Tab.Screen name="Settings" component={SettingsNavigator} options={{ title: 'Ajustes', tabBarLabel: 'Ajustes' }} />
        <Tab.Screen
          name="Create"
          component={CreateScreen}
          options={{
            title: 'Crear',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
