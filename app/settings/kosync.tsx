import { Stack } from "expo-router";

import { KosyncSettingsScreen } from "@/components/kosync-settings-screen";

export default function KosyncSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "KOSync" }} />
      <KosyncSettingsScreen />
    </>
  );
}
