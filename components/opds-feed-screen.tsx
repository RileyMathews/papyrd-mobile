import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";

import { DSButton, ButtonBackgroundColor } from "@/components/ds/button";
import { useOpdsResource } from "@/hooks/use-opds-resource";
import {
  downloadPublicationToLibrary,
  findLocalBookForPublication,
  isNativeDownloadSupported,
  type LocalBook,
} from "@/lib/library";
import {
  fetchOpdsFeed,
  fetchOpdsPublication,
  getAuthors,
  getFeedEntries,
  getOpdsAuthHeaders,
  getPublicationAcquisitionLinks,
  getPublicationSelfLink,
  type OpdsFeed,
  type OpdsLink,
  type OpdsPublication,
  type OpdsPublicationDocument,
  resolveOpdsUrl,
} from "@/lib/opds";
import type { OpdsServerSettings } from "@/lib/settings";
import { DSBookCard } from "./ds/book-card";
import { DSCard } from "./ds/card";
import { DSScreen } from "./ds/screen";
import { DSText, TextColor, TextSize } from "./ds/text";
import { SimpleScreen } from "./simple-screen";

type OpdsFeedScreenProps = {
  href: string;
  server: OpdsServerSettings;
};

type DownloadActionState =
  | { kind: "available" }
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "downloaded"; book: LocalBook }
  | { kind: "unavailable" }
  | { kind: "unsupported" };

export function OpdsFeedScreen({ href, server }: OpdsFeedScreenProps) {
  const loadFeed = useMemo(() => fetchOpdsFeed.bind(null, server), [server]);
  const { data, error, isLoading, refresh } = useOpdsResource(href, loadFeed);

  if (isLoading && !data) {
    return <SimpleScreen title="Loading catalog" message="Fetching the OPDS feed." />;
  }

  if (error && !data) {
    return (
      <SimpleScreen
        title="Couldn’t load catalog"
        message={error.message}
        actionLabel="Try again"
        onPress={refresh}
      />
    );
  }

  if (!data) {
    return <SimpleScreen title="Catalog unavailable" message="No feed data was returned." />;
  }

  return <FeedContent feed={data} isRefreshing={isLoading} onRefresh={refresh} server={server} />;
}

function FeedContent({
  feed,
  isRefreshing,
  onRefresh,
  server,
}: {
  feed: OpdsFeed;
  isRefreshing: boolean;
  onRefresh: () => void;
  server: OpdsServerSettings;
}) {
  const entries = useMemo(() => getFeedEntries(feed), [feed]);

  return (
    <DSScreen refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
      <DSText size={TextSize.XLarge}>{feed.metadata?.title ?? "Catalog"}</DSText>
      {typeof feed.metadata?.numberOfItems === "number" ? (
        <DSText color={TextColor.Secondary}>{feed.metadata.numberOfItems} items discovered</DSText>
      ) : null}

      {entries.navigation.length > 0 ? (
        <>
          {entries.navigation.map((link) => (
            <LinkRow key={`${link.href}-${link.title}`} link={link} server={server} />
          ))}
        </>
      ) : null}

      {entries.groups.map((group, index) => (
        <View key={`${group.metadata?.title ?? "group"}-${index}`}>
          {group.metadata?.title ? (
            <DSText size={TextSize.Large}>{group.metadata.title}</DSText>
          ) : null}

          {group.navigation?.map((link) => (
            <LinkRow key={`${link.href}-${link.title}`} link={link} server={server} />
          ))}

          {group.publications?.map((publication, publicationIndex) => (
            <PublicationCard
              key={`${publication.metadata?.identifier ?? publication.metadata?.title ?? "publication"}-${publicationIndex}`}
              publication={publication}
              server={server}
            />
          ))}
        </View>
      ))}

      {entries.publications.length > 0 ? (
        <>
          {entries.publications.map((publication, index) => (
            <PublicationCard
              key={`${publication.metadata?.identifier ?? publication.metadata?.title ?? "publication"}-${index}`}
              publication={publication}
              server={server}
            />
          ))}
        </>
      ) : null}

      {entries.navigation.length === 0 &&
      entries.groups.length === 0 &&
      entries.publications.length === 0 ? (
        <StateCard message="This feed does not expose navigation or publications yet." />
      ) : null}
    </DSScreen>
  );
}

function LinkRow({ link, server }: { link: OpdsLink; server: OpdsServerSettings }) {
  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: "/feed",
          params: {
            href: resolveOpdsUrl(link.href, server),
            title: link.title ?? "Feed",
            serverId: server.id,
          },
        });
      }}
    >
      <DSCard>
        <DSText size={TextSize.Large}>{link.title ?? link.href}</DSText>
        <DSText color={TextColor.Secondary} size={TextSize.Small}>
          Feed
        </DSText>
      </DSCard>
    </Pressable>
  );
}

function PublicationCard({
  publication,
  server,
}: {
  publication: OpdsPublication;
  server: OpdsServerSettings;
}) {
  const cover = publication.images?.[0]?.href;
  const authors = getAuthors(publication.metadata);
  const selfLink = getPublicationSelfLink(publication);
  const hasAcquisitionLinks = getPublicationAcquisitionLinks(publication).length > 0;
  const canResolveDownload = hasAcquisitionLinks || Boolean(selfLink);
  const [downloadedBook, setDownloadedBook] = useState<LocalBook | null>(null);
  const [isCheckingDownload, setIsCheckingDownload] = useState(() => isNativeDownloadSupported());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeDownloadSupported()) {
      setDownloadedBook(null);
      setIsCheckingDownload(false);
      return;
    }

    let isActive = true;

    setDownloadedBook(null);
    setIsCheckingDownload(true);
    void findLocalBookForPublication(publication, server)
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
  }, [publication, server]);

  const downloadActionState = getDownloadActionState({
    canResolveDownload,
    downloadedBook,
    isCheckingDownload,
    isDownloading,
  });

  async function loadDownloadablePublication(): Promise<OpdsPublicationDocument> {
    if (hasAcquisitionLinks) {
      return publication;
    }

    if (!selfLink) {
      throw new Error("This publication does not expose a download link.");
    }

    const publicationDocument = await fetchOpdsPublication(server, selfLink.href);

    if (getPublicationSelfLink(publicationDocument)) {
      return publicationDocument;
    }

    return {
      ...publicationDocument,
      links: [...(publicationDocument.links ?? []), selfLink],
    };
  }

  async function handleDownload() {
    if (isDownloading) {
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const publicationDocument = await loadDownloadablePublication();
      const book = await downloadPublicationToLibrary(publicationDocument, server);
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
    <DSBookCard
      authors={authors}
      coverSource={
        cover ? { uri: resolveOpdsUrl(cover, server), headers: getOpdsAuthHeaders(server) } : null
      }
      detail={!canResolveDownload ? "No download link exposed" : null}
      footer={
        <PublicationActions
          downloadError={downloadError}
          state={downloadActionState}
          onDownload={handleDownload}
        />
      }
      subtitle={publication.metadata?.modified ? `Updated ${formatDate(publication.metadata.modified)}` : null}
      title={publication.metadata?.title ?? "Untitled"}
    />
  );
}

function getDownloadActionState({
  canResolveDownload,
  downloadedBook,
  isCheckingDownload,
  isDownloading,
}: {
  canResolveDownload: boolean;
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

  if (!canResolveDownload) {
    return { kind: "unavailable" };
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
        <DSText color={TextColor.Secondary}>Downloads are only available on iOS and Android.</DSText>
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
          title="Read"
        />
      );

    case "downloading":
      return (
        <DSButton
          disabled
          onPress={() => void onDownload()}
          backgroundColor={ButtonBackgroundColor.Secondary}
          title="Downloading"
        />
      );

    case "checking":
      return (
        <DSButton
          disabled
          onPress={() => void onDownload()}
          backgroundColor={ButtonBackgroundColor.Secondary}
          title="Checking library"
        />
      );

    case "unsupported":
      return (
        <DSButton
          disabled
          onPress={() => void onDownload()}
          backgroundColor={ButtonBackgroundColor.Secondary}
          title="Download"
        />
      );

    case "available":
      return (
        <DSButton
          onPress={() => void onDownload()}
          backgroundColor={ButtonBackgroundColor.Secondary}
          title="Download"
        />
      );

    case "unavailable":
      return null;
  }
}

function StateCard({ message }: { message: string }) {
  return (
    <DSCard>
      <DSText color={TextColor.Secondary}>{message}</DSText>
    </DSCard>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
