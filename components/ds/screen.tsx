import { ReactNode } from "react";
import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";

type DSScreenProps = ScrollViewProps & {
  children: ReactNode;
};

export function DSScreen({ children, contentContainerStyle, style, ...props }: DSScreenProps) {
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#020617",
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 28,
  },
});
