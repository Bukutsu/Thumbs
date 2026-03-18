import { Redirect } from "expo-router";

export default function Index() {
  // This automatically sends the user straight into your tab layout
  // It's like a "invisible" entry point.
  return <Redirect href="/(tabs)" />;
}
