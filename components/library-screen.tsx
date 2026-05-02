import { useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { MenuView } from "@react-native-menu/menu";

import { useLocalLibrary } from "@/hooks/use-local-library";
import { deleteLocalBook, isNativeDownloadSupported, type LocalBook } from "@/lib/library";
import { DSScreen } from "./ds/screen";
import { SimpleScreen } from "./simple-screen";

export function LibraryScreen() {
  const { books, error, isLoading, refresh } = useLocalLibrary();
  const didOpenMenuRef = useRef(false);
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

  function openBook(book: LocalBook) {
    router.push({
      pathname: "/reader-foliate" as never,
      params: {
        bookId: book.id,
        title: book.title,
      } as never,
    });
  }

  if (!isNativeDownloadSupported()) {
    return (
      <SimpleScreen
        title="Library unavailable"
        message="Local downloads are only supported on iOS and Android right now."
      />
    );
  }

  if (isLoading && books.length === 0) {
    return <SimpleScreen title="Loading library" message="Checking downloaded books." />;
  }

  if (error && books.length === 0) {
    return <SimpleScreen title="Couldn’t load library" message={error.message} />;
  }

  if (books.length === 0) {
    return (
      <SimpleScreen
        title="Your library is empty"
        message="Download a book from the Browse tab and it will appear here."
      />
    );
  }

  return (
    <DSScreen
      contentContainerStyle={styles.shelf}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
    >
      {books.map((book) => (
        <MenuView
          key={book.id}
          title={book.title}
          shouldOpenOnLongPress
          actions={[
            {
              id: "delete",
              title: deletingBookId === book.id ? "Deleting..." : "Delete local copy",
              attributes: {
                destructive: true,
                disabled: deletingBookId === book.id,
              },
            },
          ]}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === "delete") {
              confirmDelete(book);
            }
          }}
          onOpenMenu={() => {
            didOpenMenuRef.current = true;
          }}
        >
          <Pressable
            accessibilityHint="Long press for book actions."
            accessibilityLabel={`Read ${book.title}`}
            accessibilityRole="button"
            disabled={deletingBookId === book.id}
            onPress={() => {
              if (didOpenMenuRef.current) {
                didOpenMenuRef.current = false;
                return;
              }

              openBook(book);
            }}
            style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
          >
            <View style={styles.coverShadow}>
              {book.coverUri ? (
                <Image source={{ uri: book.coverUri }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
            </View>
          </Pressable>
        </MenuView>
      ))}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  shelf: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    paddingBottom: 32,
  },
  bookButton: {
    alignItems: "center",
    opacity: 1,
    width: 100,
  },
  bookButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  coverShadow: {
    backgroundColor: "#020617",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  cover: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    height: 150,
    width: 100,
  },
  coverPlaceholder: {
    backgroundColor: "#172554",
    borderColor: "#1e40af",
  },
});
