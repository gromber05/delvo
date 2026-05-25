import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { SettingsScreen } from '../screens/SettingsScreen';
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
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio', tabBarLabel: 'Inicio' }} />
        <Tab.Screen name="Tasks" component={PlannerScreen} options={{ title: 'Tareas', tabBarLabel: 'Tareas' }} />
        <Tab.Screen name="Stella" component={ChatScreen} options={{ title: 'Stella', tabBarLabel: 'Stella' }} />
        {isAdmin && (
          <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin', tabBarLabel: 'Admin' }} />
        )}
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes', tabBarLabel: 'Ajustes' }} />
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
