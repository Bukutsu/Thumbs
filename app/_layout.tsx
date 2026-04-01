import { Stack } from "expo-router";
import { ThemeProvider } from "../contexts/ThemeContext";

const RootLayout = () => {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
};

export default RootLayout;