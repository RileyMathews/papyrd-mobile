import { Button, Platform, StyleSheet, View, type ButtonProps as NativeButtonProps } from "react-native";

export enum ButtonBackgroundColor {
  Primary = "#082f49",
  Secondary = "#1e293b",
  Danger = "#991b1b",
}

type ButtonProps = {
  title: string;
  onPress: NativeButtonProps["onPress"];
  backgroundColor?: ButtonBackgroundColor;
  disabled?: boolean;
};

export function DSButton({
  title,
  onPress,
  backgroundColor = ButtonBackgroundColor.Primary,
  disabled = false,
}: ButtonProps) {
  const buttonColor = Platform.OS === "ios" ? "#e0f2fe" : backgroundColor;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Button color={buttonColor} disabled={disabled} onPress={onPress} title={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: "hidden",
  },
});
