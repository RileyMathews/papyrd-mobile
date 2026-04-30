import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type CardProps = {
  children: ReactNode;
};

export function DSCard({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
});
