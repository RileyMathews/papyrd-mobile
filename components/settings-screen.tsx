import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

export function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Configure Papyrd</Text>
        <Text style={styles.subtitle}>
          Manage catalog servers and optional reading progress sync.
        </Text>
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
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color="#7dd3fc" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
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
  eyebrow: {
    color: "#7dd3fc",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 23,
  },
  row: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  rowPressed: {
    opacity: 0.85,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#082f49",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
  },
  rowSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
  },
  chevron: {
    color: "#60a5fa",
    fontSize: 28,
    lineHeight: 28,
  },
});
