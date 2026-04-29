import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { DSButton, ButtonBackgroundColor } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSField } from "@/components/ds/field";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
import {
  createOpdsServerSettings,
  getAppSettings,
  saveOpdsServers,
  type OpdsServerSettings,
} from "@/lib/settings";

export function OpdsSettingsScreen() {
  const [servers, setServers] = useState<OpdsServerSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadServers() {
    setIsLoading(true);
    setMessage(null);

    try {
      const settings = await getAppSettings();
      setServers(settings.opdsServers);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load OPDS servers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadServers();
  }, []);

  async function saveServer(server: OpdsServerSettings) {
    setMessage(null);

    try {
      const serverExists = servers.some((candidate) => candidate.id === server.id);
      const nextServers = serverExists
        ? servers.map((candidate) => (candidate.id === server.id ? server : candidate))
        : [...servers, server];
      const saved = await saveOpdsServers(nextServers);
      setServers(saved);
      setMessage(`${server.name || "OPDS server"} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save OPDS server.");
    }
  }

  async function removeServer(server: OpdsServerSettings) {
    setMessage(null);

    try {
      const saved = await saveOpdsServers(
        servers.filter((candidate) => candidate.id !== server.id),
      );
      setServers(saved);
      setMessage(`${server.name || "OPDS server"} removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove OPDS server.");
    }
  }

  function addServer() {
    setServers((current) => [...current, createOpdsServerSettings()]);
    setMessage("Fill in the new server details, then save its card.");
  }

  if (isLoading) {
    return (
      <StateScreen title="Loading OPDS settings" message="Reading configured catalog servers." />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {message ? <DSText>{message}</DSText> : null}

      {servers.map((server, index) => (
        <OpdsServerCard
          key={server.id}
          server={server}
          title={`Server ${index + 1}`}
          onSave={saveServer}
          onRemove={removeServer}
        />
      ))}

      {servers.length === 0 ? (
        <DSCard>
          <View style={styles.emptyCardContent}>
            <DSText size={TextSize.Large}>No OPDS servers yet</DSText>
            <DSText color={TextColor.Secondary} size={TextSize.Small}>
              Add a catalog before using the Browse tab.
            </DSText>
          </View>
        </DSCard>
      ) : null}

      <DSButton onPress={addServer} backgroundColor={ButtonBackgroundColor.Secondary}>
        <DSText>Add OPDS server</DSText>
      </DSButton>
    </ScrollView>
  );
}

function OpdsServerCard({
  server,
  title,
  onSave,
  onRemove,
}: {
  server: OpdsServerSettings;
  title: string;
  onSave: (server: OpdsServerSettings) => Promise<void>;
  onRemove: (server: OpdsServerSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(server);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    setDraft(server);
  }, [server]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await onRemove(draft);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <DSCard>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <DSText size={TextSize.Large}>{title}</DSText>
          <DSButton
            disabled={isRemoving}
            onPress={() => void handleRemove()}
            backgroundColor={ButtonBackgroundColor.Danger}
          >
            <DSText size={TextSize.Small}>{isRemoving ? "Removing..." : "Remove"}</DSText>
          </DSButton>
        </View>

        <DSField
          label="Display name"
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder="My books"
        />
        <DSField
          autoCapitalize="none"
          label="OPDS URL"
          value={draft.baseUrl}
          onChangeText={(baseUrl) => setDraft({ ...draft, baseUrl })}
          placeholder="https://example.com/opds"
        />
        <DSField
          autoCapitalize="none"
          label="Username"
          value={draft.username}
          onChangeText={(username) => setDraft({ ...draft, username })}
          placeholder="Optional"
        />
        <DSField
          label="Password"
          value={draft.password}
          onChangeText={(password) => setDraft({ ...draft, password })}
          placeholder="Optional"
          secureTextEntry
        />

        <DSButton disabled={isSaving || isRemoving} onPress={() => void handleSave()}>
          <DSText>{isSaving ? "Saving..." : "Save this server"}</DSText>
        </DSButton>
      </View>
    </DSCard>
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

const styles = StyleSheet.create({
  screen: { backgroundColor: "#020617", flex: 1 },
  content: { gap: 18, padding: 20, paddingTop: 28 },
  header: { gap: 6 },
  cardContent: { flex: 1, gap: 16 },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  emptyCardContent: { alignItems: "center", flex: 1, gap: 8 },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#020617",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
});
