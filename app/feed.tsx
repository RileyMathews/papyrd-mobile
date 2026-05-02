import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";

import { OpdsFeedScreen } from "@/components/opds-feed-screen";
import { SimpleScreen } from "@/components/simple-screen";
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
    return <SimpleScreen message={error} />;
  }

  if (!server) {
    return <SimpleScreen message="Loading OPDS server settings." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: params.title ?? server.name }} />
      <OpdsFeedScreen href={params.href ?? server.baseUrl} server={server} />
    </>
  );
}
