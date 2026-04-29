import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { useOpdsResource } from "@/hooks/use-opds-resource";
import {
  fetchOpdsFeed,
  getAuthors,
  getFeedEntries,
  getOpdsAuthHeaders,
  getPublicationSelfLink,
  type OpdsFeed,
  type OpdsLink,
  type OpdsPublication,
  resolveOpdsUrl,
} from "@/lib/opds";
import type { OpdsServerSettings } from "@/lib/settings";
import { ButtonBackgroundColor, DSButton } from "./ds/button";
import { DSCard } from "./ds/card";
import { DSText, TextColor, TextSize } from "./ds/text";

type OpdsFeedScreenProps = {
  href: string;
  server: OpdsServerSettings;
};

export function OpdsFeedScreen({ href, server }: OpdsFeedScreenProps) {
  const loadFeed = useMemo(() => fetchOpdsFeed.bind(null, server), [server]);
  const { data, error, isLoading, refresh } = useOpdsResource(href, loadFeed);

  if (isLoading && !data) {
    return <StateScreen title="Loading catalog" message="Fetching the OPDS feed." />;
  }

  if (error && !data) {
    return (
      <StateScreen
        title="Couldn’t load catalog"
        message={error.message}
        actionLabel="Try again"
        onPress={refresh}
      />
    );
  }

  if (!data) {
    return <StateScreen title="Catalog unavailable" message="No feed data was returned." />;
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <DSText size={TextSize.XLarge}>{feed.metadata?.title ?? "Catalog"}</DSText>
        {typeof feed.metadata?.numberOfItems === "number" ? (
          <DSText color={TextColor.Secondary}>
            {feed.metadata.numberOfItems} items discovered
          </DSText>
        ) : null}
      </View>

      {entries.navigation.length > 0 ? (
        <Section title="Browse">
          {entries.navigation.map((link) => (
            <LinkRow key={`${link.href}-${link.title}`} link={link} server={server} />
          ))}
        </Section>
      ) : null}

      {entries.groups.map((group, index) => (
        <View key={`${group.metadata?.title ?? "group"}-${index}`} style={styles.groupBlock}>
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
        <Section title="Books">
          {entries.publications.map((publication, index) => (
            <PublicationCard
              key={`${publication.metadata?.identifier ?? publication.metadata?.title ?? "publication"}-${index}`}
              publication={publication}
              server={server}
            />
          ))}
        </Section>
      ) : null}

      {entries.navigation.length === 0 &&
      entries.groups.length === 0 &&
      entries.publications.length === 0 ? (
        <StateCard message="This feed does not expose navigation or publications yet." />
      ) : null}
    </ScrollView>
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
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <DSCard>
        <View style={styles.rowTextWrap}>
          <DSText size={TextSize.Large}>{link.title ?? link.href}</DSText>
          <DSText color={TextColor.Secondary} size={TextSize.Small}>
            Feed
          </DSText>
        </View>
        <DSText size={TextSize.XLarge}>›</DSText>
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

  return (
    <Pressable
      disabled={!selfLink}
      onPress={() => {
        if (!selfLink) {
          return;
        }

        router.push({
          pathname: "/publication",
          params: {
            href: resolveOpdsUrl(selfLink.href, server),
            title: publication.metadata?.title ?? "Publication",
            serverId: server.id,
          },
        });
      }}
      style={({ pressed }) => [pressed ? styles.pressed : null, !selfLink ? styles.disabled : null]}
    >
      <DSCard>
        {cover ? (
          <Image
            source={{ uri: resolveOpdsUrl(cover, server), headers: getOpdsAuthHeaders(server) }}
            style={styles.cover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <DSText color={TextColor.Secondary} size={TextSize.Small}>
              No cover
            </DSText>
          </View>
        )}

        <View style={styles.cardContent}>
          <DSText size={TextSize.Large}>{publication.metadata?.title ?? "Untitled"}</DSText>
          {authors.length > 0 ? (
            <DSText color={TextColor.Secondary}>{authors.join(", ")}</DSText>
          ) : null}
          {publication.metadata?.modified ? (
            <DSText color={TextColor.Secondary}>
              Updated {formatDate(publication.metadata.modified)}
            </DSText>
          ) : null}
          {!selfLink ? (
            <DSText color={TextColor.Secondary}>No detail document exposed</DSText>
          ) : null}
        </View>
      </DSCard>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <DSText size={TextSize.Large}>{title}</DSText>
      {children}
    </View>
  );
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
        <DSButton onPress={onPress} backgroundColor={ButtonBackgroundColor.Primary}>
          <DSText>{actionLabel}</DSText>
        </DSButton>
      ) : null}
    </View>
  );
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    gap: 24,
    padding: 20,
  },
  header: {
    gap: 6,
    paddingTop: 24,
  },
  section: {
    gap: 12,
  },
  groupBlock: {
    gap: 12,
  },
  rowTextWrap: {
    flex: 1,
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
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
    flex: 1,
    gap: 6,
    justifyContent: "center",
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
