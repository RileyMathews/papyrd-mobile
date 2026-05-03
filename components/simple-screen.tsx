import { DSButton } from "@/components/ds/button";
import { DSScreen } from "@/components/ds/screen";
import { DSText, TextColor, TextSize } from "@/components/ds/text";

type SimpleScreenProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
};

export function SimpleScreen({ title, message, actionLabel, onPress }: SimpleScreenProps) {
  return (
    <DSScreen>
      {title ? <DSText size={TextSize.XLarge}>{title}</DSText> : null}
      <DSText color={TextColor.Secondary}>{message}</DSText>
      {actionLabel && onPress ? (
        <DSButton onPress={onPress} title={actionLabel} />
      ) : null}
    </DSScreen>
  );
}
