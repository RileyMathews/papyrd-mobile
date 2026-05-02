import { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoliateReaderDom, { type FoliateReaderProgress } from "@/components/readers/foliate/dom";
import { SimpleScreen } from "@/components/simple-screen";
import { KosyncClient } from "@/lib/kosync";
import {
  getLocalBook,
  getLocalBookDocumentHash,
  isNativeDownloadSupported,
  type LocalBook,
} from "@/lib/library";
import {
  getLocalReaderProgress,
  saveLocalReaderProgress,
  type LocalReaderProgress,
} from "@/lib/reader-progress";
import {
  clampReaderFontScale,
  getAppSettings,
  saveReaderSettings,
  type KosyncSettings,
  type ReaderSettings,
} from "@/lib/settings";

type FoliateReaderScreenProps = {
  bookId: string;
};

const KOSYNC_PUSH_DEBOUNCE_MS = 5000;

export function FoliateReaderScreen({ bookId }: FoliateReaderScreenProps) {
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<LocalBook | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [remoteXPointer, setRemoteXPointer] = useState<string | null>(null);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({ fontScale: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const settingsRef = useRef<KosyncSettings | null>(null);
  const bookRef = useRef<LocalBook | null>(null);
  const documentHashRef = useRef<string | null>(null);
  const latestProgressRef = useRef<FoliateReaderProgress | null>(null);
  const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  bookRef.current = book;

  const appendDiagnostic = useCallback(async (message: string) => {
    console.log(`[reader-foliate] ${message}`);
  }, []);

  const pushProgress = useCallback(
    async (progress: FoliateReaderProgress) => {
      const settings = settingsRef.current;
      const documentHash = documentHashRef.current;
      const syncProgress = progress.xpointer ?? progress.cfi;

      if (!documentHash || !settings?.enabled || !syncProgress) {
        void appendDiagnostic(
          `kosync: push skipped (enabled=${String(settings?.enabled ?? false)}, documentHash=${documentHash ?? "missing"}, progress=${syncProgress ? "present" : "missing"})`,
        );
        return;
      }

      try {
        void appendDiagnostic(
          `kosync: pushing progress document=${documentHash} percentage=${progress.percentage.toFixed(4)} progress=${syncProgress}`,
        );
        await new KosyncClient(settings).updateProgress({
          documentHash,
          progress: syncProgress,
          percentage: progress.percentage,
        });
        void appendDiagnostic("kosync: push succeeded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to push KOSync progress.";
        void appendDiagnostic(`native: failed to push KOSync progress (${message})`);
      }
    },
    [appendDiagnostic],
  );

  const flushPendingPush = useCallback(async () => {
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    }

    const progress = latestProgressRef.current;

    if (!progress) {
      void appendDiagnostic("kosync: debounced push skipped (no latest progress)");
      return;
    }

    await pushProgress(progress);
  }, [appendDiagnostic, pushProgress]);

  const schedulePushProgress = useCallback(() => {
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    void appendDiagnostic(`kosync: scheduling debounced push in ${KOSYNC_PUSH_DEBOUNCE_MS}ms`);
    pushTimeoutRef.current = setTimeout(() => {
      void flushPendingPush();
    }, KOSYNC_PUSH_DEBOUNCE_MS);
  }, [appendDiagnostic, flushPendingPush]);

  useEffect(() => {
    let isActive = true;

    async function loadLocalBook() {
      setIsLoading(true);
      setErrorMessage(null);
      void appendDiagnostic(`native: loading local book ${bookId}`);

      try {
        const localBook = await getLocalBook(bookId);

        if (!isActive) {
          return;
        }

        if (!localBook) {
          setBook(null);
          setErrorMessage("This local book could not be found.");
          void appendDiagnostic("native: local book not found");
          return;
        }

        const documentHash = await getLocalBookDocumentHash(localBook);
        const [settings, localProgress] = await Promise.all([
          getAppSettings(),
          getLocalReaderProgress(localBook.id),
        ]);
        void appendDiagnostic(
          `kosync: settings loaded enabled=${String(settings.kosync.enabled)} server=${settings.kosync.serverUrl || "missing"} username=${settings.kosync.username ? "present" : "missing"} userkey=${settings.kosync.userkey ? "present" : "missing"}`,
        );
        void appendDiagnostic(
          `kosync: local progress ${localProgress ? `cfi=${localProgress.cfi} xpointer=${localProgress.xpointer ?? "missing"} updatedAt=${localProgress.updatedAt}` : "missing"}`,
        );
        void appendDiagnostic(`kosync: document hash ${documentHash ?? "missing"}`);
        const remoteProgress = await getRemoteProgress(
          documentHash,
          settings.kosync,
          localProgress,
          appendDiagnostic,
        );

        documentHashRef.current = documentHash;
        settingsRef.current = settings.kosync;
        setReaderSettings(settings.reader);
        setBook(localBook);
        setInitialCfi(localProgress?.cfi ?? null);
        setRemoteXPointer(remoteProgress);
        void appendDiagnostic(`native: loaded metadata for ${localBook.title}`);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load this local book.";
        setBook(null);
        setErrorMessage(message);
        void appendDiagnostic(`native: failed to load local book (${message})`);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLocalBook();

    return () => {
      isActive = false;
    };
  }, [appendDiagnostic, bookId]);

  useEffect(() => {
    return () => {
      void flushPendingPush();
    };
  }, [flushPendingPush]);

  const loadBookBase64 = useCallback(async () => {
    if (!book) {
      throw new Error("This local book is not ready yet.");
    }

    const file = new File(book.fileUri);
    void appendDiagnostic(`native: reading EPUB file ${book.fileUri}`);

    if (!file.exists) {
      void appendDiagnostic("native: EPUB file missing from disk");
      throw new Error("The downloaded EPUB file is missing from local storage.");
    }

    const base64 = await file.base64();
    void appendDiagnostic(`native: read ${base64.length} base64 chars`);
    return base64;
  }, [appendDiagnostic, book]);

  const handleProgressChanged = useCallback(
    async (progress: FoliateReaderProgress) => {
      const currentBook = bookRef.current;

      if (!currentBook) {
        return;
      }

      await saveLocalReaderProgress(currentBook.id, progress);
      latestProgressRef.current = progress;
      void appendDiagnostic(
        `kosync: saved local progress percentage=${progress.percentage.toFixed(4)} xpointer=${progress.xpointer ?? "missing"}`,
      );
      schedulePushProgress();
    },
    [appendDiagnostic, schedulePushProgress],
  );

  const handleFontScaleChange = useCallback(
    (nextFontScale: number) => {
      const nextReaderSettings = {
        ...readerSettings,
        fontScale: clampReaderFontScale(nextFontScale),
      };

      setReaderSettings(nextReaderSettings);
      void saveReaderSettings(nextReaderSettings).catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to save reader settings.";
        void appendDiagnostic(`reader: failed to save font scale (${message})`);
      });
    },
    [appendDiagnostic, readerSettings],
  );

  if (!isNativeDownloadSupported()) {
    return (
      <SimpleScreen
        title="Reader unavailable"
        message="The foliate reader is only available on iOS and Android right now."
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#e2e8f0" />
        <Text style={styles.loadingText}>Opening foliate reader</Text>
      </View>
    );
  }

  if (errorMessage || !book) {
    return (
      <SimpleScreen
        title="Reader unavailable"
        message={errorMessage ?? "This local book could not be opened."}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <FoliateReaderDom
        bookTitle={book.title}
        fontScale={readerSettings.fontScale}
        initialCfi={initialCfi}
        loadBook={loadBookBase64}
        onFontScaleChange={handleFontScaleChange}
        onProgressChanged={handleProgressChanged}
        reportDiagnostic={appendDiagnostic}
        remoteXPointer={remoteXPointer}
        dom={{
          bounces: false,
          scrollEnabled: false,
          style: [styles.reader, { marginBottom: insets.bottom }],
        }}
      />
    </View>
  );
}

async function getRemoteProgress(
  documentHash: string | null,
  settings: KosyncSettings,
  localProgress: LocalReaderProgress | null,
  appendDiagnostic: (message: string) => Promise<void>,
) {
  if (!documentHash || !settings.enabled) {
    await appendDiagnostic(
      `kosync: pull skipped (enabled=${String(settings.enabled)}, documentHash=${documentHash ?? "missing"})`,
    );
    return null;
  }

  try {
    await appendDiagnostic(`kosync: pulling remote progress document=${documentHash}`);
    const remote = await new KosyncClient(settings).getProgress(documentHash);

    if (!remote?.progress?.startsWith("/body")) {
      await appendDiagnostic(
        `kosync: no usable remote progress (${remote?.progress ? `progress=${remote.progress}` : "empty response"})`,
      );
      return null;
    }

    if (!localProgress || remote.progress !== localProgress.xpointer) {
      await appendDiagnostic(
        `kosync: remote progress differs; applying server progress=${remote.progress} percentage=${remote.percentage ?? "unknown"} timestamp=${remote.timestamp ?? "unknown"}`,
      );
      return remote.progress;
    }

    await appendDiagnostic("kosync: remote progress matches local progress; no jump needed");
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pull KOSync progress.";
    await appendDiagnostic(`native: failed to pull KOSync progress (${message})`);
    return null;
  }
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#020617",
    flex: 1,
  },
  reader: {
    backgroundColor: "#020617",
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: "#020617",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#cbd5e1",
    fontSize: 15,
  },
});
