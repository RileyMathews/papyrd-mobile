import type { OpdsServerSettings } from "@/lib/settings";

type MaybeArray<T> = T | T[];

export type OpdsLink = {
  href: string;
  type?: string;
  rel?: MaybeArray<string>;
  title?: string;
};

export type OpdsContributor = {
  name?: string;
};

export type OpdsMetadata = {
  title?: string;
  identifier?: string;
  modified?: string;
  description?: string;
  numberOfItems?: number;
  author?: MaybeArray<OpdsContributor>;
};

export type OpdsPublication = {
  metadata?: OpdsMetadata;
  links?: OpdsLink[];
  images?: OpdsLink[];
};

export type OpdsFeed = {
  metadata?: OpdsMetadata;
  links?: OpdsLink[];
  navigation?: OpdsLink[];
  publications?: OpdsPublication[];
  groups?: Array<{
    metadata?: OpdsMetadata;
    links?: OpdsLink[];
    navigation?: OpdsLink[];
    publications?: OpdsPublication[];
  }>;
};

export type OpdsPublicationDocument = OpdsPublication;

export class OpdsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpdsError";
    this.status = status;
  }
}

function createBasicAuthHeader(server: OpdsServerSettings) {
  if (!server.username && !server.password) {
    return null;
  }

  const credentials = `${server.username}:${server.password}`;

  if (typeof globalThis.btoa === "function") {
    return `Basic ${globalThis.btoa(credentials)}`;
  }

  throw new Error("Basic auth encoding is unavailable in this runtime.");
}

export function getOpdsAuthHeaders(server: OpdsServerSettings): Record<string, string> {
  const authorization = createBasicAuthHeader(server);

  return authorization ? { Authorization: authorization } : {};
}

export function resolveOpdsUrl(href: string, server: OpdsServerSettings) {
  return new URL(href, server.baseUrl).toString();
}

export function getLinkRel(link: OpdsLink) {
  return Array.isArray(link.rel) ? link.rel : link.rel ? [link.rel] : [];
}

export function getAuthors(metadata?: OpdsMetadata) {
  const authors = metadata?.author;

  if (!authors) {
    return [];
  }

  const list = Array.isArray(authors) ? authors : [authors];

  return list.map((author) => author.name).filter(Boolean) as string[];
}

export function getFeedEntries(feed: OpdsFeed) {
  return {
    navigation: feed.navigation ?? [],
    groups: feed.groups ?? [],
    publications: feed.publications ?? [],
  };
}

export function getPublicationSelfLink(publication: OpdsPublication) {
  return publication.links?.find((link) => getLinkRel(link).includes("self"));
}

export function getPublicationAcquisitionLinks(publication: OpdsPublication) {
  return (
    publication.links?.filter((link) =>
      getLinkRel(link).includes("http://opds-spec.org/acquisition"),
    ) ?? []
  );
}

async function fetchOpdsDocument<T>(
  server: OpdsServerSettings,
  href: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(resolveOpdsUrl(href, server), {
    headers: {
      Accept: "application/opds+json, application/opds-publication+json, application/json",
      ...getOpdsAuthHeaders(server),
    },
    signal,
  });

  if (!response.ok) {
    throw new OpdsError(`OPDS request failed with HTTP ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

export function fetchOpdsFeed(server: OpdsServerSettings, href: string, signal?: AbortSignal) {
  return fetchOpdsDocument<OpdsFeed>(server, href, signal);
}

export function fetchOpdsPublication(
  server: OpdsServerSettings,
  href: string,
  signal?: AbortSignal,
) {
  return fetchOpdsDocument<OpdsPublicationDocument>(server, href, signal);
}
