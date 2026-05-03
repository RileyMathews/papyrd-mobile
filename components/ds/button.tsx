import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

export enum ButtonBackgroundColor {
  Primary = "#082f49",
  Secondary = "#1e293b",
  Danger = "#991b1b",
}

type ButtonProps = {
  title: string;
  onPress: PressableProps["onPress"];
  backgroundColor?: ButtonBackgroundColor;
  disabled?: boolean;
};

export function DSButton({
  title,
  onPress,
  backgroundColor = ButtonBackgroundColor.Primary,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.label}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    color: "#e0f2fe",
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
