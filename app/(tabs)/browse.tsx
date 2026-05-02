import { useCallback, useState } from "react";
import { Pressable, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { DSButton } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSScreen } from "@/components/ds/screen";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
import { SimpleScreen } from "@/components/simple-screen";
import { getAppSettings, type OpdsServerSettings } from "@/lib/settings";

export default function BrowseRoute() {
  const [servers, setServers] = useState<OpdsServerSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadServers() {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await getAppSettings();
      setServers(settings.opdsServers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error("Failed to load OPDS servers."));
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadServers();
    }, []),
  );

  if (isLoading && servers.length === 0) {
    return <SimpleScreen title="Loading catalogs" message="Reading OPDS server settings." />;
  }

  if (error && servers.length === 0) {
    return <SimpleScreen title="Couldn’t load catalogs" message={error.message} />;
  }

  return (
    <DSScreen
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void loadServers()} />}
    >
      <DSText size={TextSize.XLarge}>OPDS catalogs</DSText>
      <DSText color={TextColor.Secondary}>
        Choose a configured server to browse. Add more from Settings.
      </DSText>

      {servers.map((server) => (
        <Pressable
          key={server.id}
          onPress={() => {
            router.push({
              pathname: "/feed",
              params: {
                href: server.baseUrl,
                serverId: server.id,
                title: server.name,
              },
            });
          }}
        >
          <DSCard>
            <DSText>{server.name}</DSText>
            <DSText color={TextColor.Secondary}>{server.baseUrl}</DSText>
            {server.username ? (
              <DSText color={TextColor.Secondary}>Signed in as {server.username}</DSText>
            ) : null}
          </DSCard>
        </Pressable>
      ))}

      {servers.length === 0 ? (
        <StateCard
          message="Set up an OPDS server in Settings before browsing catalogs."
          actionLabel="Open Settings"
          onPress={() => router.push("/settings")}
        />
      ) : null}
    </DSScreen>
  );
}

function StateCard({
  message,
  actionLabel,
  onPress,
}: {
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <DSCard>
      <DSText color={TextColor.Secondary}>{message}</DSText>
      {actionLabel && onPress ? (
        <DSButton onPress={onPress}>
          <DSText>{actionLabel}</DSText>
        </DSButton>
      ) : null}
    </DSCard>
  );
}
