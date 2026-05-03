import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";

import { useLocalLibrary } from "@/hooks/use-local-library";
import { deleteLocalBook, isNativeDownloadSupported, type LocalBook } from "@/lib/library";
import { DSButton, ButtonBackgroundColor } from "./ds/button";
import { DSScreen } from "./ds/screen";
import { DSText, TextColor, TextSize } from "./ds/text";
import { SimpleScreen } from "./simple-screen";

export function LibraryScreen() {
  const { books, error, isLoading, refresh } = useLocalLibrary();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState(() => new Set<string>());
  const selectedBooks = books.filter((book) => selectedBookIds.has(book.id));

  function enterSelectMode() {
    setIsSelecting(true);
    setSelectedBookIds(new Set());
  }

  function exitSelectMode() {
    if (isDeleting) {
      return;
    }

    setIsSelecting(false);
    setSelectedBookIds(new Set());
  }

  function toggleBookSelection(book: LocalBook) {
    setSelectedBookIds((current) => {
      const next = new Set(current);

      if (next.has(book.id)) {
        next.delete(book.id);
      } else {
        next.add(book.id);
      }

      return next;
    });
  }

  function confirmDeleteSelected() {
    if (selectedBooks.length === 0) {
      return;
    }

    const title =
      selectedBooks.length === 1
        ? "Delete selected book?"
        : `Delete ${selectedBooks.length} selected books?`;
    const message =
      selectedBooks.length === 1
        ? `Remove ${selectedBooks[0].title} from this device?`
        : "Remove these books from this device?";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void handleDeleteSelected(selectedBooks);
        },
      },
    ]);
  }

  async function handleDeleteSelected(booksToDelete: LocalBook[]) {
    setIsDeleting(true);

    try {
      for (const book of booksToDelete) {
        await deleteLocalBook(book);
      }

      await refresh();
      setIsSelecting(false);
      setSelectedBookIds(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete this book.";
      Alert.alert("Delete failed", message);
      void refresh();
    } finally {
      setIsDeleting(false);
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
    <View style={styles.screen}>
      <DSScreen
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
      >
        <View style={styles.headerBar}>
          <View style={styles.headerTitle}>
            <DSText size={TextSize.XLarge}>Library</DSText>
          </View>
          {!isSelecting ? (
            <DSButton backgroundColor={ButtonBackgroundColor.Secondary} onPress={enterSelectMode}>
              <DSText>Select</DSText>
            </DSButton>
          ) : null}
        </View>

        <View style={styles.shelf}>
          {books.map((book) => {
            const isSelected = selectedBookIds.has(book.id);

            return (
              <Pressable
                key={book.id}
                accessibilityHint={isSelecting ? "Selects this book for deletion." : "Opens this book."}
                accessibilityLabel={isSelecting ? `Select ${book.title}` : `Read ${book.title}`}
                accessibilityRole={isSelecting ? "checkbox" : "button"}
                accessibilityState={isSelecting ? { checked: isSelected, disabled: isDeleting } : undefined}
                disabled={isDeleting}
                onPress={() => {
                  if (isSelecting) {
                    toggleBookSelection(book);
                    return;
                  }

                  openBook(book);
                }}
                style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
              >
                <View style={styles.coverShadow}>
                  {book.coverUri ? (
                    <Image
                      source={{ uri: book.coverUri }}
                      style={[styles.cover, isSelected && styles.coverSelected]}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[styles.cover, styles.coverPlaceholder, isSelected && styles.coverSelected]}
                    />
                  )}
                  {isSelecting ? (
                    <>
                      {isSelected ? <View pointerEvents="none" style={styles.selectedOverlay} /> : null}
                      <View
                        pointerEvents="none"
                        style={[
                          styles.selectionIndicator,
                          isSelected && styles.selectionIndicatorSelected,
                        ]}
                      >
                        {isSelected ? <Ionicons name="checkmark" size={15} color="#020617" /> : null}
                      </View>
                    </>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </DSScreen>

      {isSelecting ? (
        <View style={styles.selectionBar}>
          <DSText color={TextColor.Secondary}>
            {selectedBooks.length === 1 ? "1 selected" : `${selectedBooks.length} selected`}
          </DSText>
          <View style={styles.selectionActions}>
            <DSButton
              backgroundColor={ButtonBackgroundColor.Secondary}
              disabled={isDeleting}
              onPress={exitSelectMode}
            >
              <DSText color={TextColor.Secondary}>Cancel</DSText>
            </DSButton>
            <DSButton
              backgroundColor={ButtonBackgroundColor.Danger}
              disabled={isDeleting || selectedBooks.length === 0}
              onPress={confirmDeleteSelected}
            >
              <View style={styles.buttonContent}>
                {isDeleting ? <ActivityIndicator color="#fee2e2" size="small" /> : null}
                <DSText>Delete</DSText>
              </View>
            </DSButton>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#020617",
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  headerBar: {
    // alignItems: "center",
    backgroundColor: "#020617",
    borderBottomColor: "#111827",
    // borderBottomWidth: 1,
    flexDirection: "row",
    // gap: 16,
    // justifyContent: "space-between",
    // paddingBottom: 16,
    // width: "100%",
  },
  headerTitle: {
    flex: 1,
  },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  selectionBar: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderTopColor: "#111827",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  bottomButtonContainer: {
    minWidth: 84,
  },
  shelf: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
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
  coverSelected: {
    borderColor: "#fca5a5",
    borderWidth: 2,
  },
  coverPlaceholder: {
    backgroundColor: "#172554",
    borderColor: "#1e40af",
  },
  selectedOverlay: {
    backgroundColor: "rgba(127, 29, 29, 0.28)",
    borderRadius: 8,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  selectionIndicator: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderColor: "#fca5a5",
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 26,
  },
  selectionIndicatorSelected: {
    backgroundColor: "#fca5a5",
  },
});
