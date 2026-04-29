import { ReactNode } from "react";
import { Pressable } from "react-native";

export enum ButtonBackgroundColor {
  Primary = "#082f49",
  Secondary = "#1e293b",
  Danger = "#991b1b",
}

type ButtonProps = {
  children: ReactNode;
  onPress: () => void;
  backgroundColor?: ButtonBackgroundColor;
  disabled?: boolean;
};

export function DSButton({
  children,
  onPress,
  backgroundColor = ButtonBackgroundColor.Primary,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor,
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}
