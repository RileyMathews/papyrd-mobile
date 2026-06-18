import { Stack, useLocalSearchParams } from "expo-router";

import { FoliateReaderScreen } from "@/components/readers/foliate/screen";

export default function FoliateReaderRoute() {
  const params = useLocalSearchParams<{ bookId?: string; title?: string }>();
  const title = params.title ?? "Foliate Reader";

  if (!params.bookId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FoliateReaderScreen bookId={params.bookId} title={title} />
    </>
  );
}
