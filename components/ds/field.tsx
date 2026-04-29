import { type ComponentProps } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { DSText } from "@/components/ds/text";

type FieldProps = {
  label: string;
} & ComponentProps<typeof TextInput>;

export function DSField({
  label,
  placeholderTextColor = "#64748b",
  style,
  autoCorrect = false,
  ...props
}: FieldProps) {
  return (
    <View style={styles.field}>
      <DSText>{label}</DSText>
      <TextInput
        {...props}
        autoCorrect={autoCorrect}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
