import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PersonalInfoScreen } from '../screens/PersonalInfoScreen';
import { SecurityScreen } from '../screens/SecurityScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  PersonalInfo: undefined;
  Security: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
    </Stack.Navigator>
  );
}
