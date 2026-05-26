import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, Text, TextInput } from 'react-native';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const BaseText = Text as unknown as { defaultProps?: { style?: unknown } };
BaseText.defaultProps = BaseText.defaultProps || {};
BaseText.defaultProps.style = [{ fontFamily: 'Arimo' }, BaseText.defaultProps.style];

const BaseTextInput = TextInput as unknown as { defaultProps?: { style?: unknown } };
BaseTextInput.defaultProps = BaseTextInput.defaultProps || {};
BaseTextInput.defaultProps.style = [{ fontFamily: 'Arimo' }, BaseTextInput.defaultProps.style];

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
