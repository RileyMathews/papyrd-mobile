import { ReactNode } from "react";
import { Text } from "react-native";

export enum TextColor {
  Primary = "#e0f2fe",
  Secondary = "#aaaaaa",
  Danger = "#fca5a5",
}

export enum TextSize {
  Medium = 14,
  Small = 12,
  Large = 18,
  XLarge = 28,
}

type TextProps = {
  children: ReactNode;
  color?: TextColor;
  size?: TextSize;
};

export function DSText({ children, color = TextColor.Primary, size = TextSize.Medium }: TextProps) {
  return <Text style={{ color, fontSize: size }}>{children}</Text>;
}
