import { type ComponentProps, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { DSCard } from "@/components/ds/card";
import { DSText, TextColor, TextSize } from "@/components/ds/text";

type DSBookCardProps = {
  title: string;
  authors?: string[];
  coverSource?: ComponentProps<typeof Image>["source"] | null;
  detail?: string | null;
  footer?: ReactNode;
  subtitle?: string | null;
};

export function DSBookCard({
  title,
  authors = [],
  coverSource,
  detail,
  footer,
  subtitle,
}: DSBookCardProps) {
  return (
    <DSCard>
      {coverSource ? (
        <Image source={coverSource} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <DSText color={TextColor.Secondary} size={TextSize.Small}>
            No cover
          </DSText>
        </View>
      )}

      <DSText size={TextSize.Large}>{title}</DSText>
      {authors.length > 0 ? <DSText color={TextColor.Secondary}>{authors.join(", ")}</DSText> : null}
      {subtitle ? <DSText color={TextColor.Secondary}>{subtitle}</DSText> : null}
      {detail ? <DSText color={TextColor.Secondary}>{detail}</DSText> : null}
      {footer}
    </DSCard>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    height: 108,
    width: 76,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
