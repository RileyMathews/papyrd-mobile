import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";

import { DSButton, ButtonBackgroundColor } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSField } from "@/components/ds/field";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
import { KosyncClient } from "@/lib/kosync";
import {
  getAppSettings,
  saveKosyncSettings,
  userkeyFromPassword,
  type KosyncSettings,
} from "@/lib/settings";

export function KosyncSettingsScreen() {
  const [settings, setSettings] = useState<KosyncSettings | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    void getAppSettings().then((appSettings) => {
      if (isActive) {
        setSettings(appSettings.kosync);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  async function save(testConnection: boolean) {
    if (!settings) return;

    setIsSaving(true);
    setMessage(null);

    const nextSettings = {
      ...settings,
      userkey: password ? userkeyFromPassword(password) : settings.userkey,
    };

    try {
      if (testConnection) {
        const result = await new KosyncClient(nextSettings).connect(
          nextSettings.username,
          nextSettings.userkey,
        );

        if (!result.success) {
          setMessage(result.message ?? "KOSync connection failed.");
          return;
        }

        setMessage(result.message ?? "KOSync connection succeeded.");
      } else {
        setMessage("KOSync settings saved.");
      }

      const saved = await saveKosyncSettings(nextSettings);
      setSettings(saved);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save KOSync settings.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return <StateScreen title="Loading settings" message="Reading KOSync configuration." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <DSText size={TextSize.XLarge}>KOSync settings</DSText>
      <DSText color={TextColor.Secondary}>
        Synchronize reading progress with a KOReader-compatible sync server.
      </DSText>

      <DSCard>
        <View style={styles.cardContent}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <DSText>Enable KOSync</DSText>
              <DSText color={TextColor.Secondary} size={TextSize.Small}>
                Pull on open and push progress while reading.
              </DSText>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => setSettings({ ...settings, enabled })}
              trackColor={{ false: "#334155", true: "#2563eb" }}
              thumbColor="#f8fafc"
            />
          </View>

          <DSField
            label="Server URL"
            value={settings.serverUrl}
            onChangeText={(serverUrl) => setSettings({ ...settings, serverUrl })}
            placeholder="https://sync.koreader.rocks"
          />
          <DSField
            autoCapitalize="none"
            label="Username"
            value={settings.username}
            onChangeText={(username) => setSettings({ ...settings, username })}
            placeholder="username"
          />
          <DSField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={settings.userkey ? "Saved; enter to replace" : "Required"}
            secureTextEntry
          />
          <DSField
            label="Device name"
            value={settings.deviceName}
            onChangeText={(deviceName) => setSettings({ ...settings, deviceName })}
            placeholder="Papyrd"
          />

          <DSText color={TextColor.Secondary} size={TextSize.Small}>
            When a book opens, Papyrd uses server progress if it differs from the saved local
            position. Local movement is pushed back while reading.
          </DSText>

          {message ? <DSText>{message}</DSText> : null}

          <View style={styles.actions}>
            <DSButton
              disabled={isSaving}
              onPress={() => void save(false)}
              backgroundColor={ButtonBackgroundColor.Secondary}
            >
              <DSText>{isSaving ? "Saving..." : "Save KOSync"}</DSText>
            </DSButton>
            <DSButton disabled={isSaving} onPress={() => void save(true)}>
              <DSText>{isSaving ? "Testing..." : "Save and test"}</DSText>
            </DSButton>
          </View>
        </View>
      </DSCard>
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

const styles = StyleSheet.create({
  screen: { backgroundColor: "#020617", flex: 1 },
  content: { gap: 18, padding: 20, paddingTop: 28 },
  cardContent: { flex: 1, gap: 16 },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  switchText: { flex: 1, gap: 3 },
  actions: { flexDirection: "row", gap: 10 },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#020617",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
});
