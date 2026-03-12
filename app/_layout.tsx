// app/_layout.tsx
import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";

const RootLayout = () => {
  return (
    <PaperProvider>
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
