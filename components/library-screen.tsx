import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { useLocalLibrary } from "@/hooks/use-local-library";
import { deleteLocalBook, isNativeDownloadSupported, type LocalBook } from "@/lib/library";
import { ButtonBackgroundColor, DSButton } from "./ds/button";
import { DSCard } from "./ds/card";
import { DSText, TextColor, TextSize } from "./ds/text";

export function LibraryScreen() {
  const { books, error, isLoading, refresh } = useLocalLibrary();
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  function confirmDelete(book: LocalBook) {
    Alert.alert("Delete local book?", `Remove ${book.title} from this device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void handleDelete(book);
        },
      },
    ]);
  }

  async function handleDelete(book: LocalBook) {
    setDeletingBookId(book.id);

    try {
      await deleteLocalBook(book);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete this book.";
      Alert.alert("Delete failed", message);
    } finally {
      setDeletingBookId(null);
    }
  }

  if (!isNativeDownloadSupported()) {
    return (
      <StateScreen
        title="Library unavailable"
        message="Local downloads are only supported on iOS and Android right now."
      />
    );
  }

  if (isLoading && books.length === 0) {
    return <StateScreen title="Loading library" message="Checking downloaded books." />;
  }

  if (error && books.length === 0) {
    return <StateScreen title="Couldn’t load library" message={error.message} />;
  }

  if (books.length === 0) {
    return (
      <StateScreen
        title="Your library is empty"
        message="Download a book from the Browse tab and it will appear here."
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
    >
      <DSText size={TextSize.XLarge}>Downloaded books</DSText>

      {books.map((book) => (
        <DSCard key={book.id}>
          {book.coverUri ? (
            <Image source={{ uri: book.coverUri }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <DSText color={TextColor.Secondary} size={TextSize.Small}>
                No cover
              </DSText>
            </View>
          )}

          <View style={styles.cardContent}>
            <DSText color={TextColor.Primary}>{book.title}</DSText>
            {book.authors.length > 0 ? (
              <DSText color={TextColor.Secondary}>{book.authors.join(", ")}</DSText>
            ) : null}
            {book.sourceServer ? (
              <DSText color={TextColor.Secondary}>From {book.sourceServer.name}</DSText>
            ) : null}
            <DSButton
              onPress={() => {
                router.push({
                  pathname: "/reader-foliate" as never,
                  params: {
                    bookId: book.id,
                    title: book.title,
                  } as never,
                });
              }}
            >
              <DSText>Read</DSText>
            </DSButton>
            <DSButton
              onPress={() => confirmDelete(book)}
              backgroundColor={ButtonBackgroundColor.Danger}
            >
              <DSText>{deletingBookId === book.id ? "Deleting..." : "Delete local copy"}</DSText>
            </DSButton>
          </View>
        </DSCard>
      ))}
    </ScrollView>
  );
}

function StateScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.stateScreen}>
      <DSText size={TextSize.XLarge}>{title}</DSText>
      <DSText color={TextColor.Secondary}>{message}</DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 28,
  },
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
  cardContent: {
    gap: 6,
    justifyContent: "center",
  },
  stateScreen: {
    backgroundColor: "#020617",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
});
