import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { DSText, TextColor } from "@/components/ds/text";
import { PublicationScreen } from "@/components/publication-screen";
import { getAppSettings, type OpdsServerSettings } from "@/lib/settings";

export default function PublicationRoute() {
  const params = useLocalSearchParams<{ href?: string; title?: string; serverId?: string }>();
  const [server, setServer] = useState<OpdsServerSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void getAppSettings()
      .then((settings) => {
        if (!isActive) return;

        const nextServer =
          settings.opdsServers.find((candidate) => candidate.id === params.serverId) ??
          settings.opdsServers[0] ??
          null;
        setServer(nextServer);
        setError(nextServer ? null : "No OPDS server is configured.");
      })
      .catch((loadError) => {
        if (!isActive) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load OPDS settings.");
      });

    return () => {
      isActive = false;
    };
  }, [params.serverId]);

  if (!params.href) {
    return <View style={{ flex: 1, backgroundColor: "#020617" }} />;
  }

  if (error) {
    return <StateScreen message={error} />;
  }

  if (!server) {
    return <StateScreen message="Loading OPDS server settings." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: params.title ?? "Book" }} />
      <PublicationScreen href={params.href} server={server} />
    </>
  );
}

function StateScreen({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: "#020617",
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <DSText color={TextColor.Secondary}>{message}</DSText>
    </View>
  );
}
