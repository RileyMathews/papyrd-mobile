import { Stack } from "expo-router";

import { OpdsSettingsScreen } from "@/components/opds-settings-screen";

export default function OpdsSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "OPDS servers" }} />
      <OpdsSettingsScreen />
    </>
  );
}
