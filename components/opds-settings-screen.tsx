import { useEffect, useState } from "react";

import { DSButton, ButtonBackgroundColor } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSField } from "@/components/ds/field";
import { DSScreen } from "@/components/ds/screen";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
import { SimpleScreen } from "@/components/simple-screen";
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
      <SimpleScreen title="Loading OPDS settings" message="Reading configured catalog servers." />
    );
  }

  return (
    <DSScreen keyboardShouldPersistTaps="handled">
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
          <DSText size={TextSize.Large}>No OPDS servers yet</DSText>
          <DSText color={TextColor.Secondary} size={TextSize.Small}>
            Add a catalog before using the Browse tab.
          </DSText>
        </DSCard>
      ) : null}

      <DSButton
        onPress={addServer}
        backgroundColor={ButtonBackgroundColor.Secondary}
        title="Add OPDS server"
      />
    </DSScreen>
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
      <DSText size={TextSize.Large}>{title}</DSText>
      <DSButton
        disabled={isRemoving}
        onPress={() => void handleRemove()}
        backgroundColor={ButtonBackgroundColor.Danger}
        title={isRemoving ? "Removing..." : "Remove"}
      />

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

      <DSButton
        disabled={isSaving || isRemoving}
        onPress={() => void handleSave()}
        title={isSaving ? "Saving..." : "Save this server"}
      />
    </DSCard>
  );
}
