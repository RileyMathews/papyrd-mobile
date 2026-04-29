import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { DSButton, ButtonBackgroundColor } from "@/components/ds/button";
import { DSCard } from "@/components/ds/card";
import { DSText, TextColor, TextSize } from "@/components/ds/text";
import {
  downloadPublicationToLibrary,
  findLocalBookForPublication,
  isNativeDownloadSupported,
  type LocalBook,
} from "@/lib/library";
import { useOpdsResource } from "@/hooks/use-opds-resource";
import {
  fetchOpdsPublication,
  getAuthors,
  getOpdsAuthHeaders,
  getPublicationAcquisitionLinks,
  resolveOpdsUrl,
} from "@/lib/opds";
import type { OpdsServerSettings } from "@/lib/settings";

type PublicationScreenProps = {
  href: string;
  server: OpdsServerSettings;
};

type DownloadActionState =
  | { kind: "available" }
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "downloaded"; book: LocalBook }
  | { kind: "unsupported" };

export function PublicationScreen({ href, server }: PublicationScreenProps) {
  const loadPublication = useMemo(() => fetchOpdsPublication.bind(null, server), [server]);
  const { data, error, isLoading, refresh } = useOpdsResource(href, loadPublication);
  const [downloadedBook, setDownloadedBook] = useState<LocalBook | null>(null);
  const [isCheckingDownload, setIsCheckingDownload] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !isNativeDownloadSupported()) {
      setDownloadedBook(null);
      setIsCheckingDownload(false);
      return;
    }

    let isActive = true;

    setIsCheckingDownload(true);
    void findLocalBookForPublication(data, server)
      .then((book) => {
        if (!isActive) {
          return;
        }

        setDownloadedBook(book);
        setIsCheckingDownload(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setDownloadedBook(null);
        setIsCheckingDownload(false);
      });

    return () => {
      isActive = false;
    };
  }, [data, server]);

  if (isLoading && !data) {
    return <StateScreen title="Loading book" message="Fetching publication details." />;
  }

  if (error && !data) {
    return (
      <StateScreen
        title="Couldn’t load book"
        message={error.message}
        actionLabel="Try again"
        onPress={refresh}
      />
    );
  }

  if (!data) {
    return <StateScreen title="Book unavailable" message="No publication document was returned." />;
  }

  const authors = getAuthors(data.metadata);
  const cover = data.images?.[0]?.href;
  const acquisitionLinks = getPublicationAcquisitionLinks(data);
  const downloadActionState = getDownloadActionState({
    downloadedBook,
    isCheckingDownload,
    isDownloading,
  });

  async function handleDownload() {
    if (!data) {
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const book = await downloadPublicationToLibrary(data, server);
      setDownloadedBook(book);
    } catch (downloadError) {
      setDownloadError(
        downloadError instanceof Error ? downloadError.message : "Failed to download this book.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {cover ? (
        <Image
          source={{ uri: resolveOpdsUrl(cover, server), headers: getOpdsAuthHeaders(server) }}
          style={styles.cover}
          contentFit="cover"
        />
      ) : null}
      <View style={styles.hero}>
        <DSText size={TextSize.XLarge}>{data.metadata?.title ?? "Untitled"}</DSText>
        {authors.length > 0 ? (
          <DSText color={TextColor.Secondary}>{authors.join(", ")}</DSText>
        ) : null}
      </View>

      {data.metadata?.description ? (
        <DSCard>
          <View style={styles.sectionContent}>
            <DSText size={TextSize.Large}>Description</DSText>
            <DSText color={TextColor.Secondary}>{stripHtml(data.metadata.description)}</DSText>
          </View>
        </DSCard>
      ) : null}

      <View style={styles.sectionContent}>
        {acquisitionLinks.length > 0 ? (
          <PublicationActions
            downloadError={downloadError}
            state={downloadActionState}
            onDownload={handleDownload}
          />
        ) : (
          <DSText color={TextColor.Secondary}>
            This publication does not advertise any acquisition links yet.
          </DSText>
        )}
      </View>
    </ScrollView>
  );
}

function getDownloadActionState({
  downloadedBook,
  isCheckingDownload,
  isDownloading,
}: {
  downloadedBook: LocalBook | null;
  isCheckingDownload: boolean;
  isDownloading: boolean;
}): DownloadActionState {
  if (downloadedBook) {
    return { kind: "downloaded", book: downloadedBook };
  }

  if (isDownloading) {
    return { kind: "downloading" };
  }

  if (isCheckingDownload) {
    return { kind: "checking" };
  }

  if (!isNativeDownloadSupported()) {
    return { kind: "unsupported" };
  }

  return { kind: "available" };
}

function PublicationActions({
  state,
  downloadError,
  onDownload,
}: {
  state: DownloadActionState;
  downloadError: string | null;
  onDownload: () => Promise<void>;
}) {
  return (
    <>
      <DownloadActionButton state={state} onDownload={onDownload} />
      {state.kind === "unsupported" ? (
        <DSText color={TextColor.Secondary}>
          Downloads are only available on iOS and Android right now.
        </DSText>
      ) : null}
      {downloadError ? <DSText color={TextColor.Danger}>{downloadError}</DSText> : null}
    </>
  );
}

function DownloadActionButton({
  state,
  onDownload,
}: {
  state: DownloadActionState;
  onDownload: () => Promise<void>;
}) {
  switch (state.kind) {
    case "downloaded":
      return (
        <DSButton
          onPress={() => {
            router.push({
              pathname: "/reader-foliate" as never,
              params: {
                bookId: state.book.id,
                title: state.book.title,
              } as never,
            });
          }}
          backgroundColor={ButtonBackgroundColor.Secondary}
        >
          <DSText>Read</DSText>
        </DSButton>
      );

    case "downloading":
      return (
        <DSButton disabled onPress={() => void onDownload()} backgroundColor={ButtonBackgroundColor.Secondary}>
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#f8fafc" />
            <DSText>Downloading</DSText>
          </View>
        </DSButton>
      );

    case "checking":
      return (
        <DSButton disabled onPress={() => void onDownload()} backgroundColor={ButtonBackgroundColor.Secondary}>
          <DSText>Checking library</DSText>
        </DSButton>
      );

    case "unsupported":
      return (
        <DSButton disabled onPress={() => void onDownload()} backgroundColor={ButtonBackgroundColor.Secondary}>
          <DSText>Download</DSText>
        </DSButton>
      );

    case "available":
      return (
        <DSButton onPress={() => void onDownload()} backgroundColor={ButtonBackgroundColor.Secondary}>
          <DSText>Download</DSText>
        </DSButton>
      );
  }
}

function StateScreen({
  title,
  message,
  actionLabel,
  onPress,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateScreen}>
      <DSText size={TextSize.XLarge}>{title}</DSText>
      <DSText color={TextColor.Secondary}>{message}</DSText>
      {actionLabel && onPress ? (
        <DSButton onPress={onPress} backgroundColor={ButtonBackgroundColor.Secondary}>
          <DSText>{actionLabel}</DSText>
        </DSButton>
      ) : null}
    </View>
  );
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    gap: 24,
    padding: 20,
    paddingTop: 32,
  },
  cover: {
    alignSelf: "center",
    borderRadius: 18,
    height: 280,
    width: 196,
  },
  hero: {
    gap: 8,
  },
  sectionContent: {
    flex: 1,
    gap: 12,
  },
  buttonContent: {
    gap: 4,
  },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#020617",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
});
