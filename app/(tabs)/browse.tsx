import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { DSButton } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
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
    return <StateScreen title="Loading catalogs" message="Reading OPDS server settings." />;
  }

  if (error && servers.length === 0) {
    return <StateScreen title="Couldn’t load catalogs" message={error.message} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => void loadServers()} />
      }
    >
      <View style={styles.header}>
        <DSText size={TextSize.XLarge}>OPDS catalogs</DSText>
        <DSText color={TextColor.Secondary}>
          Choose a configured server to browse. Add more from Settings.
        </DSText>
      </View>

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
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <DSCard>
            <View style={styles.cardText}>
              <DSText>{server.name}</DSText>
              <DSText color={TextColor.Secondary}>{server.baseUrl}</DSText>
              {server.username ? (
                <DSText color={TextColor.Secondary}>Signed in as {server.username}</DSText>
              ) : null}
            </View>
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
    </ScrollView>
  );
}

function StateScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.stateScreen}>
      <DSText size={TextSize.XLarge}>{title}</DSText>
      <DSText color={TextColor.Secondary}>{message}</DSText>
    </View>
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
    <View style={styles.stateCard}>
      <DSText color={TextColor.Secondary}>{message}</DSText>
      {actionLabel && onPress ? (
        <DSButton onPress={onPress}>
          <DSText>{actionLabel}</DSText>
        </DSButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0f172a", flex: 1 },
  content: { gap: 16, padding: 20, paddingTop: 28 },
  header: { gap: 6, marginBottom: 8 },
  pressed: { opacity: 0.85 },
  cardText: { gap: 5 },
  stateScreen: {
    backgroundColor: "#0f172a",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  stateCard: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
});
