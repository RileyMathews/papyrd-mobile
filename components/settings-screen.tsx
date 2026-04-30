import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { DSCard } from "@/components/ds/card";
import { DSText, TextColor, TextSize } from "@/components/ds/text";

export function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <DSText size={TextSize.XLarge}>Settings</DSText>
        <DSText color={TextColor.Secondary}>
          Manage catalog servers and optional reading progress sync.
        </DSText>
      </View>

      <SettingsRow
        icon="server-outline"
        title="OPDS servers"
        subtitle="Add and edit the catalogs you browse for books."
        onPress={() => router.push("/settings/opds")}
      />
      <SettingsRow
        icon="sync-outline"
        title="KOSync"
        subtitle="Configure KOReader-compatible progress sync."
        onPress={() => router.push("/settings/kosync")}
      />
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <DSCard>
        <Ionicons name={icon} size={24} color="#7dd3fc" />
        <View style={styles.rowText}>
          <DSText>{title}</DSText>
          <DSText color={TextColor.Secondary} size={TextSize.Small}>
            {subtitle}
          </DSText>
        </View>
      </DSCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#020617",
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 20,
    paddingTop: 28,
  },
  header: {
    gap: 6,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  rowText: {
    gap: 4,
  },
});
