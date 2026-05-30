import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, Text, TextInput } from 'react-native';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Aplica Arimo como fuente base a todos los Text y TextInput de la app
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: [{ fontFamily: 'Arimo' }, (Text as any).defaultProps?.style] };
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style: [{ fontFamily: 'Arimo' }, (TextInput as any).defaultProps?.style] };

function Root() {
  const { isDark, colors: c } = useTheme();
  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
        translucent={false}
      />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Arimo: require('./assets/fonts/Arimo-VariableFont_wght.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
