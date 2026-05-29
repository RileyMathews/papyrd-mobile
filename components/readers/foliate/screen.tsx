import Ionicons from "@expo/vector-icons/Ionicons";
import { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoliateReaderDom, {
  type FoliateReaderChapterNavigationRequest,
  type FoliateReaderProgress,
  type FoliateReaderState,
  type FoliateReaderTocEntry,
} from "@/components/readers/foliate/dom";
import { FOLIATE_READER_THEME } from "@/components/readers/foliate/theme";
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
  MAX_READER_FONT_SCALE,
  MIN_READER_FONT_SCALE,
  saveReaderSettings,
  type KosyncSettings,
  type ReaderColumnPreference,
  type ReaderSettings,
} from "@/lib/settings";

type FoliateReaderScreenProps = {
  bookId: string;
};

type ReaderPanelView = "settings" | "chapters";

const KOSYNC_PUSH_DEBOUNCE_MS = 5000;
const READER_FONT_SCALE_STEP = 0.1;

const EMPTY_READER_STATE: FoliateReaderState = {
  currentChapterLabel: null,
  currentHref: null,
  isReady: false,
  tocEntries: [],
};

export function FoliateReaderScreen({ bookId }: FoliateReaderScreenProps) {
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<LocalBook | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [remoteXPointer, setRemoteXPointer] = useState<string | null>(null);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    columnPreference: "auto",
    fontScale: 1,
  });
  const [readerState, setReaderState] = useState<FoliateReaderState>(EMPTY_READER_STATE);
  const [activePanel, setActivePanel] = useState<ReaderPanelView | null>(null);
  const [chapterNavigationRequest, setChapterNavigationRequest] =
    useState<FoliateReaderChapterNavigationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const settingsRef = useRef<KosyncSettings | null>(null);
  const bookRef = useRef<LocalBook | null>(null);
  const chapterNavigationRequestIdRef = useRef(0);
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
      const clampedFontScale = Math.round(clampReaderFontScale(nextFontScale) * 100) / 100;
      const nextReaderSettings = {
        ...readerSettings,
        fontScale: clampedFontScale,
      };

      setReaderSettings(nextReaderSettings);
      void saveReaderSettings(nextReaderSettings).catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to save reader settings.";
        void appendDiagnostic(`reader: failed to save font scale (${message})`);
      });
    },
    [appendDiagnostic, readerSettings],
  );

  const handleColumnPreferenceChange = useCallback(
    (nextColumnPreference: ReaderColumnPreference) => {
      const nextReaderSettings = {
        ...readerSettings,
        columnPreference: nextColumnPreference,
      };

      setReaderSettings(nextReaderSettings);
      void saveReaderSettings(nextReaderSettings).catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to save reader settings.";
        void appendDiagnostic(`reader: failed to save column preference (${message})`);
      });
    },
    [appendDiagnostic, readerSettings],
  );

  const handleReaderStateChange = useCallback((nextReaderState: FoliateReaderState) => {
    setReaderState(nextReaderState);
  }, []);

  const handleColumnPreferenceToggle = useCallback(() => {
    handleColumnPreferenceChange(readerSettings.columnPreference === "single" ? "auto" : "single");
  }, [handleColumnPreferenceChange, readerSettings.columnPreference]);

  const handleChapterSelect = useCallback((index: number) => {
    chapterNavigationRequestIdRef.current += 1;
    setActivePanel(null);
    setChapterNavigationRequest({
      id: chapterNavigationRequestIdRef.current,
      index,
    });
  }, []);

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
        chapterNavigationRequest={chapterNavigationRequest}
        columnPreference={readerSettings.columnPreference}
        fontScale={readerSettings.fontScale}
        initialCfi={initialCfi}
        loadBook={loadBookBase64}
        onProgressChanged={handleProgressChanged}
        onReaderStateChange={handleReaderStateChange}
        reportDiagnostic={appendDiagnostic}
        remoteXPointer={remoteXPointer}
        dom={{
          bounces: false,
          scrollEnabled: false,
          style: [styles.reader, { marginBottom: insets.bottom }],
        }}
      />
      <Pressable
        accessibilityLabel="Reader settings"
        accessibilityRole="button"
        accessibilityState={{ expanded: activePanel !== null }}
        onPress={() => setActivePanel("settings")}
        style={({ pressed }) => [
          styles.settingsButton,
          activePanel !== null && styles.settingsButtonActive,
          pressed && styles.settingsButtonPressed,
        ]}
      >
        <Ionicons name="settings-outline" size={24} color="#e0f2fe" />
      </Pressable>
      <ReaderSettingsPanel
        activePanel={activePanel}
        bottomInset={insets.bottom}
        columnPreference={readerSettings.columnPreference}
        currentChapterLabel={readerState.currentChapterLabel}
        currentHref={readerState.currentHref}
        fontScale={readerSettings.fontScale}
        isReaderReady={readerState.isReady}
        onBackToSettings={() => setActivePanel("settings")}
        onClose={() => setActivePanel(null)}
        onColumnPreferenceToggle={handleColumnPreferenceToggle}
        onFontScaleChange={handleFontScaleChange}
        onOpenChapters={() => setActivePanel("chapters")}
        onSelectChapter={handleChapterSelect}
        tocEntries={readerState.tocEntries}
      />
    </View>
  );
}

type ReaderSettingsPanelProps = {
  activePanel: ReaderPanelView | null;
  bottomInset: number;
  columnPreference: ReaderColumnPreference;
  currentChapterLabel: string | null;
  currentHref: string | null;
  fontScale: number;
  isReaderReady: boolean;
  onBackToSettings: () => void;
  onClose: () => void;
  onColumnPreferenceToggle: () => void;
  onFontScaleChange: (fontScale: number) => void;
  onOpenChapters: () => void;
  onSelectChapter: (index: number) => void;
  tocEntries: FoliateReaderTocEntry[];
};

function ReaderSettingsPanel({
  activePanel,
  bottomInset,
  columnPreference,
  currentChapterLabel,
  currentHref,
  fontScale,
  isReaderReady,
  onBackToSettings,
  onClose,
  onColumnPreferenceToggle,
  onFontScaleChange,
  onOpenChapters,
  onSelectChapter,
  tocEntries,
}: ReaderSettingsPanelProps) {
  if (!activePanel) {
    return null;
  }

  const canDecreaseFontScale = fontScale > MIN_READER_FONT_SCALE;
  const canIncreaseFontScale = fontScale < MAX_READER_FONT_SCALE;
  const fontScalePercent = Math.round(fontScale * 100);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={activePanel !== null}
    >
      <View style={styles.panelOverlay}>
        <View style={[styles.panelSheet, { paddingBottom: Math.max(bottomInset, 12) }]}> 
          <View style={styles.panelHeader}>
            {activePanel === "chapters" ? (
              <PanelHeaderButton onPress={onBackToSettings} title="Back" />
            ) : (
              <View style={styles.panelHeaderSpacer} />
            )}
            <Text style={styles.panelTitle}>
              {activePanel === "chapters" ? "Chapters" : "Reader settings"}
            </Text>
            <PanelHeaderButton onPress={onClose} title="Close" />
          </View>

          {activePanel === "settings" ? (
            <ScrollView contentContainerStyle={styles.panelContent}>
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Text</Text>
                <View style={styles.settingRow}>
                  <View style={styles.settingRowText}>
                    <Text style={styles.settingRowTitle}>Font size</Text>
                    <Text style={styles.settingRowSubtitle}>{fontScalePercent}%</Text>
                  </View>
                  <View style={styles.fontControls}>
                    <FontControlButton
                      accessibilityLabel="Decrease font size"
                      disabled={!canDecreaseFontScale}
                      onPress={() => onFontScaleChange(fontScale - READER_FONT_SCALE_STEP)}
                      title="A-"
                    />
                    <FontControlButton
                      accessibilityLabel="Reset font size"
                      onPress={() => onFontScaleChange(1)}
                      title="Reset"
                    />
                    <FontControlButton
                      accessibilityLabel="Increase font size"
                      disabled={!canIncreaseFontScale}
                      onPress={() => onFontScaleChange(fontScale + READER_FONT_SCALE_STEP)}
                      title="A+"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Layout</Text>
                <View style={styles.settingRow}>
                  <View style={styles.settingRowText}>
                    <Text style={styles.settingRowTitle}>Columns</Text>
                    <Text style={styles.settingRowSubtitle}>
                      {columnPreference === "single" ? "Single column" : "Automatic columns"}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Toggle single-column reader layout"
                    accessibilityRole="button"
                    accessibilityState={{ selected: columnPreference === "single" }}
                    onPress={onColumnPreferenceToggle}
                    style={({ pressed }) => [
                      styles.columnToggle,
                      columnPreference === "single" && styles.columnToggleActive,
                      pressed && styles.controlPressed,
                    ]}
                  >
                    <Text style={styles.columnToggleText}>
                      {columnPreference === "single" ? "1 col" : "Auto"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Book</Text>
                <Pressable
                  accessibilityLabel="Open chapters"
                  accessibilityRole="button"
                  onPress={onOpenChapters}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.controlPressed]}
                >
                  <View style={styles.settingRowText}>
                    <Text style={styles.settingRowTitle}>Chapters</Text>
                    <Text numberOfLines={1} style={styles.settingRowSubtitle}>
                      {currentChapterLabel ??
                        (tocEntries.length > 0 ? `${tocEntries.length} chapters` : "No chapters")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={FOLIATE_READER_THEME.primaryMuted} />
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.panelContent}>
              {tocEntries.length > 0 ? (
                tocEntries.map((entry, index) => {
                  const isCurrent = isCurrentTocEntry(entry, currentHref);

                  return (
                    <Pressable
                      key={entry.id}
                      accessibilityLabel={`Open ${entry.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !isReaderReady, selected: isCurrent }}
                      disabled={!isReaderReady}
                      onPress={() => onSelectChapter(index)}
                      style={({ pressed }) => [
                        styles.chapterButton,
                        { paddingLeft: 16 + entry.depth * 14 },
                        isCurrent && styles.chapterButtonCurrent,
                        pressed && styles.controlPressed,
                        !isReaderReady && styles.disabledControl,
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={[styles.chapterButtonText, isCurrent && styles.chapterButtonTextCurrent]}
                      >
                        {entry.label}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.emptyChapters}>This book does not expose a table of contents.</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PanelHeaderButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.panelHeaderButton, pressed && styles.controlPressed]}
    >
      <Text style={styles.panelHeaderButtonText}>{title}</Text>
    </Pressable>
  );
}

function FontControlButton({
  accessibilityLabel,
  disabled = false,
  onPress,
  title,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fontControlButton,
        disabled && styles.disabledControl,
        pressed && !disabled && styles.controlPressed,
      ]}
    >
      <Text style={[styles.fontControlButtonText, disabled && styles.disabledControlText]}>{title}</Text>
    </Pressable>
  );
}

function isCurrentTocEntry(entry: FoliateReaderTocEntry, currentHref: string | null) {
  if (!currentHref) {
    return false;
  }

  const entryBaseHref = entry.href.split("#")[0];
  const currentBaseHref = currentHref.split("#")[0];

  return entry.href === currentHref || entryBaseHref === currentHref || entryBaseHref === currentBaseHref;
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
    backgroundColor: FOLIATE_READER_THEME.background,
    flex: 1,
    position: "relative",
  },
  reader: {
    backgroundColor: FOLIATE_READER_THEME.background,
    flex: 1,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.panelBackground,
    borderColor: FOLIATE_READER_THEME.border,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 12,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 44,
    zIndex: 12,
  },
  settingsButtonActive: {
    borderColor: FOLIATE_READER_THEME.primary,
  },
  settingsButtonPressed: {
    opacity: 0.82,
  },
  panelOverlay: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "flex-end",
  },
  panelSheet: {
    backgroundColor: FOLIATE_READER_THEME.sheetBackground,
    borderTopColor: FOLIATE_READER_THEME.sheetBorder,
    borderTopWidth: 1,
    maxHeight: "78%",
    width: "100%",
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  panelHeaderSpacer: {
    width: 64,
  },
  panelTitle: {
    color: FOLIATE_READER_THEME.strongForeground,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  panelHeaderButton: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.panelBackground,
    borderColor: FOLIATE_READER_THEME.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  panelHeaderButtonText: {
    color: FOLIATE_READER_THEME.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  panelContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingSection: {
    gap: 8,
    paddingVertical: 8,
  },
  settingSectionTitle: {
    color: FOLIATE_READER_THEME.subtleForeground,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  settingRow: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.subtlePanelBackground,
    borderColor: FOLIATE_READER_THEME.subtleBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  settingRowText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  settingRowTitle: {
    color: FOLIATE_READER_THEME.strongForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  settingRowSubtitle: {
    color: FOLIATE_READER_THEME.subtleForeground,
    fontSize: 13,
  },
  fontControls: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.panelBackground,
    borderColor: FOLIATE_READER_THEME.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  fontControlButton: {
    alignItems: "center",
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  fontControlButtonText: {
    color: FOLIATE_READER_THEME.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  columnToggle: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.panelBackground,
    borderColor: FOLIATE_READER_THEME.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  columnToggleActive: {
    borderColor: FOLIATE_READER_THEME.primary,
  },
  columnToggleText: {
    color: FOLIATE_READER_THEME.primaryMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  menuRow: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.subtlePanelBackground,
    borderColor: FOLIATE_READER_THEME.subtleBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  chapterButton: {
    borderRadius: 12,
    paddingBottom: 9,
    paddingRight: 12,
    paddingTop: 9,
  },
  chapterButtonCurrent: {
    backgroundColor: FOLIATE_READER_THEME.subtlePanelBackground,
  },
  chapterButtonText: {
    color: FOLIATE_READER_THEME.foreground,
    fontSize: 14,
  },
  chapterButtonTextCurrent: {
    color: FOLIATE_READER_THEME.primaryMuted,
    fontWeight: "700",
  },
  emptyChapters: {
    color: FOLIATE_READER_THEME.subtleForeground,
    padding: 12,
  },
  controlPressed: {
    opacity: 0.82,
  },
  disabledControl: {
    opacity: 0.5,
  },
  disabledControlText: {
    color: FOLIATE_READER_THEME.disabledForeground,
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: FOLIATE_READER_THEME.background,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: FOLIATE_READER_THEME.mutedForeground,
    fontSize: 15,
  },
});
