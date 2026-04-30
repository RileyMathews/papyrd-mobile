import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { OpdsFeedScreen } from "@/components/opds-feed-screen";
import { DSText, TextColor } from "@/components/ds/text";
import { getAppSettings, type OpdsServerSettings } from "@/lib/settings";

export default function FeedRoute() {
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

  if (error) {
    return <StateScreen message={error} />;
  }

  if (!server) {
    return <StateScreen message="Loading OPDS server settings." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: params.title ?? server.name }} />
      <OpdsFeedScreen href={params.href ?? server.baseUrl} server={server} />
    </>
  );
}

function StateScreen({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: "#0f172a",
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <DSText color={TextColor.Secondary}>{message}</DSText>
    </View>
  );
}
