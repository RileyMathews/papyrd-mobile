import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

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
        <Text style={styles.eyebrow}>Browse</Text>
        <Text style={styles.title}>OPDS catalogs</Text>
        <Text style={styles.subtitle}>
          Choose a configured server to browse. Add more from Settings.
        </Text>
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
          style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{server.name}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {server.baseUrl}
            </Text>
            {server.username ? (
              <Text style={styles.cardMeta}>Signed in as {server.username}</Text>
            ) : null}
          </View>
          <Text style={styles.chevron}>›</Text>
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
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
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
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onPress ? (
        <Pressable onPress={onPress} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0f172a", flex: 1 },
  content: { gap: 16, padding: 20, paddingTop: 28 },
  header: { gap: 6, marginBottom: 8 },
  eyebrow: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: { color: "#f8fafc", fontSize: 32, fontWeight: "700" },
  subtitle: { color: "#94a3b8", fontSize: 15, lineHeight: 23 },
  card: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 16,
  },
  cardPressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: 5 },
  cardTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  cardMeta: { color: "#94a3b8", fontSize: 14 },
  chevron: { color: "#60a5fa", fontSize: 28, lineHeight: 28 },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  stateTitle: { color: "#f8fafc", fontSize: 26, fontWeight: "700", textAlign: "center" },
  stateMessage: { color: "#94a3b8", fontSize: 15, lineHeight: 22, textAlign: "center" },
  stateCard: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#eff6ff", fontSize: 15, fontWeight: "700" },
});
