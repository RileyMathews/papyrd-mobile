import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { listLocalBooks, type LocalBook } from "@/lib/library";

type LibraryState = {
  books: LocalBook[];
  error: Error | null;
  isLoading: boolean;
};

export function useLocalLibrary() {
  const [state, setState] = useState<LibraryState>({
    books: [],
    error: null,
    isLoading: true,
  });

  const loadBooks = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const books = await listLocalBooks();
      setState({ books, error: null, isLoading: false });
    } catch (error) {
      setState({
        books: [],
        error: error instanceof Error ? error : new Error("Failed to load local books."),
        isLoading: false,
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBooks();
    }, [loadBooks]),
  );

  return {
    ...state,
    refresh: loadBooks,
  };
}
