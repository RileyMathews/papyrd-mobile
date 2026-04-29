import { Stack, useLocalSearchParams } from "expo-router";

import { FoliateReaderScreen } from "@/components/readers/foliate/screen";

export default function FoliateReaderRoute() {
  const params = useLocalSearchParams<{ bookId?: string; title?: string }>();

  if (!params.bookId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: params.title ?? "Foliate Reader" }} />
      <FoliateReaderScreen bookId={params.bookId} />
    </>
  );
}
