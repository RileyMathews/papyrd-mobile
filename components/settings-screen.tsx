import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Linking, Pressable } from "react-native";
import { router } from "expo-router";

import { DSCard } from "@/components/ds/card";
import { DSScreen } from "@/components/ds/screen";
import { DSText, TextColor, TextSize } from "@/components/ds/text";

export function SettingsScreen() {
  const openProjectPage = async (page: string) => {
    try {
      await Linking.openURL(`https://github.com/RileyMathews/papyrd-mobile/blob/main/docs/${page}.md`);
    } catch {
      Alert.alert("Unable to open page", "Please visit github.com/RileyMathews/papyrd-mobile for privacy information and support.");
    }
  };

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
      <SettingsRow
        icon="shield-checkmark-outline"
        title="Privacy policy"
        subtitle="Local storage and connections to your chosen servers."
        onPress={() => void openProjectPage("privacy-policy")}
      />
      <SettingsRow
        icon="help-circle-outline"
        title="Support"
        subtitle="Setup help and contact the maintainer."
        onPress={() => void openProjectPage("support")}
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
      accessibilityRole="button"
      accessibilityLabel={title}
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
