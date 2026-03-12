import { Stack } from "expo-router";
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from "react-native-paper";
import { useColorScheme } from "react-native";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";

const RootLayout = () => {
  // 1. Detect if the phone is in light or dark mode
  const colorScheme = useColorScheme();

  // 2. Extract the actual system-level Material You colors from Android 12+
  const { theme } = useMaterial3Theme();

  // 3. Merge the system colors with React Native Paper's default themes
  const paperTheme =
    colorScheme === "dark"
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };

  return (
    // 4. Pass the merged system theme to the provider
    <PaperProvider theme={paperTheme}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </PaperProvider>
  );
};

export default RootLayout;
