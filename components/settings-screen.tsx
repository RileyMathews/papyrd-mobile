import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";
import { router } from "expo-router";

import { DSCard } from "@/components/ds/card";
import { DSScreen } from "@/components/ds/screen";
import { DSText, TextColor, TextSize } from "@/components/ds/text";

export function SettingsScreen() {
  return (
    <DSScreen>
      <DSText size={TextSize.XLarge}>Settings</DSText>
      <DSText color={TextColor.Secondary}>
        Manage catalog servers and optional reading progress sync.
      </DSText>

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
    </DSScreen>
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
    >
      <DSCard>
        <Ionicons name={icon} size={24} color="#7dd3fc" />
        <DSText>{title}</DSText>
        <DSText color={TextColor.Secondary} size={TextSize.Small}>
          {subtitle}
        </DSText>
      </DSCard>
    </Pressable>
  );
}
