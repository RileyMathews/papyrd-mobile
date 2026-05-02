import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#020617" },
        headerTintColor: "#f8fafc",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#020617" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="feed" options={{ title: "Browse" }} />
      <Stack.Screen name="reader-foliate" options={{ title: "Reader" }} />
    </Stack>
  );
}
