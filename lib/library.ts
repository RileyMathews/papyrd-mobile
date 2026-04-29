import { Directory, File, Paths } from "expo-file-system";
import SparkMD5 from "spark-md5";
import { Platform } from "react-native";

import {
  getAuthors,
  getOpdsAuthHeaders,
  getPublicationAcquisitionLinks,
  getPublicationSelfLink,
  type OpdsLink,
  type OpdsPublicationDocument,
  resolveOpdsUrl,
} from "@/lib/opds";
import type { OpdsServerSettings } from "@/lib/settings";

const LIBRARY_DIRECTORY_NAME = "library";
const METADATA_FILE_NAME = "metadata.json";

export type LocalBook = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  modified?: string;
  bookFileName: string;
  fileUri: string;
  coverFileName?: string;
  coverUri?: string;
  mimeType?: string;
  publicationHref?: string;
  acquisitionHref: string;
  downloadedAt: string;
  sourceServer?: {
    id: string;
    name: string;
    baseUrl: string;
  };
};

export function isNativeDownloadSupported() {
  return Platform.OS !== "web";
}

export async function listLocalBooks() {
  if (!isNativeDownloadSupported()) {
    return [] satisfies LocalBook[];
  }

  const libraryDirectory = getLibraryDirectory();

  if (!libraryDirectory.exists) {
    return [] satisfies LocalBook[];
  }

  const entries = libraryDirectory.list();
  const books = await Promise.all(
    entries
      .filter((entry): entry is Directory => entry instanceof Directory)
      .map((entry) => readBookMetadata(entry)),
  );

  return books
    .filter((book): book is LocalBook => book !== null)
    .sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
}

export async function findLocalBookForPublication(
  publication: OpdsPublicationDocument,
  server: OpdsServerSettings,
) {
  if (!isNativeDownloadSupported()) {
    return null;
  }

  const bookDirectory = getBookDirectory(getPublicationId(publication, server));
  const metadataFile = new File(bookDirectory, METADATA_FILE_NAME);

  if (!metadataFile.exists) {
    return null;
  }

  return readMetadataFile(metadataFile, bookDirectory);
}

export async function getLocalBook(bookId: string) {
  if (!isNativeDownloadSupported()) {
    return null;
  }

  const bookDirectory = getBookDirectory(bookId);
  const metadataFile = new File(bookDirectory, METADATA_FILE_NAME);

  if (!metadataFile.exists) {
    return null;
  }

  return readMetadataFile(metadataFile, bookDirectory);
}

export async function downloadPublicationToLibrary(
  publication: OpdsPublicationDocument,
  server: OpdsServerSettings,
) {
  if (!isNativeDownloadSupported()) {
    throw new Error("Downloading books is only supported on iOS and Android right now.");
  }

  const acquisitionLink = getPublicationAcquisitionLinks(publication)[0];

  if (!acquisitionLink) {
    throw new Error("This publication does not expose an acquisition link.");
  }

  ensureLibraryDirectory();

  const bookId = getPublicationId(publication, server);
  const bookDirectory = getBookDirectory(bookId);
  bookDirectory.create({ idempotent: true, intermediates: true });

  const bookFileName = `book${inferFileExtension(acquisitionLink, ".epub")}`;
  const downloadFile = new File(bookDirectory, bookFileName);
  const downloadedBook = await File.downloadFileAsync(
    resolveOpdsUrl(acquisitionLink.href, server),
    downloadFile,
    {
      headers: getOpdsAuthHeaders(server),
      idempotent: true,
    },
  );

  let coverUri: string | undefined;
  let coverFileName: string | undefined;
  const coverLink = publication.images?.[0];

  if (coverLink) {
    coverFileName = `cover${inferFileExtension(coverLink, ".jpg")}`;
    const coverFile = new File(bookDirectory, coverFileName);

    try {
      const downloadedCover = await File.downloadFileAsync(
        resolveOpdsUrl(coverLink.href, server),
        coverFile,
        {
          headers: getOpdsAuthHeaders(server),
          idempotent: true,
        },
      );
      coverUri = downloadedCover.uri;
    } catch {
      coverUri = undefined;
      coverFileName = undefined;
    }
  }

  const selfLink = getPublicationSelfLink(publication);
  const metadata: LocalBook = {
    id: bookId,
    title: publication.metadata?.title ?? "Untitled",
    authors: getAuthors(publication.metadata),
    description: publication.metadata?.description,
    modified: publication.metadata?.modified,
    bookFileName,
    fileUri: downloadedBook.uri,
    coverFileName,
    coverUri,
    mimeType: acquisitionLink.type,
    publicationHref: selfLink ? resolveOpdsUrl(selfLink.href, server) : undefined,
    acquisitionHref: resolveOpdsUrl(acquisitionLink.href, server),
    downloadedAt: new Date().toISOString(),
    sourceServer: {
      id: server.id,
      name: server.name,
      baseUrl: server.baseUrl,
    },
  };

  const metadataFile = new File(bookDirectory, METADATA_FILE_NAME);
  metadataFile.create({ intermediates: true, overwrite: true });
  metadataFile.write(JSON.stringify(metadata, null, 2));

  return metadata;
}

export async function getLocalBookDocumentHash(book: LocalBook) {
  const file = new File(book.fileUri);

  if (!file.exists) {
    return null;
  }

  return hashFile(file);
}

export async function deleteLocalBook(book: LocalBook) {
  if (!isNativeDownloadSupported()) {
    throw new Error("Deleting books is only supported on iOS and Android right now.");
  }

  const bookDirectory = getBookDirectory(book.id);

  if (!bookDirectory.exists) {
    return;
  }

  bookDirectory.delete();
}

function getLibraryDirectory() {
  return new Directory(Paths.document, LIBRARY_DIRECTORY_NAME);
}

function ensureLibraryDirectory() {
  const libraryDirectory = getLibraryDirectory();
  libraryDirectory.create({ idempotent: true, intermediates: true });
  return libraryDirectory;
}

function getBookDirectory(bookId: string) {
  return new Directory(getLibraryDirectory(), bookId);
}

function getPublicationId(publication: OpdsPublicationDocument, server: OpdsServerSettings) {
  const source =
    publication.metadata?.identifier ??
    getPublicationSelfLink(publication)?.href ??
    publication.metadata?.title ??
    "book";

  return `${slugify(publication.metadata?.title ?? "book")}-${hashString(`${server.id}:${source}`)}`;
}

async function readBookMetadata(directory: Directory) {
  return readMetadataFile(new File(directory, METADATA_FILE_NAME), directory);
}

async function readMetadataFile(metadataFile: File, bookDirectory: Directory) {
  if (!metadataFile.exists) {
    return null;
  }

  try {
    const parsed = JSON.parse(await metadataFile.text()) as Partial<LocalBook>;
    return normalizeLocalBookMetadata(parsed, bookDirectory);
  } catch {
    return null;
  }
}

function normalizeLocalBookMetadata(
  metadata: Partial<LocalBook>,
  bookDirectory: Directory,
): LocalBook | null {
  if (
    !metadata.id ||
    !metadata.title ||
    !metadata.bookFileName ||
    !metadata.acquisitionHref ||
    !metadata.downloadedAt
  ) {
    return null;
  }

  const bookFile = new File(bookDirectory, metadata.bookFileName);

  if (!bookFile.exists) {
    return null;
  }

  const coverFile = metadata.coverFileName ? new File(bookDirectory, metadata.coverFileName) : null;

  return {
    id: metadata.id,
    title: metadata.title,
    authors: Array.isArray(metadata.authors) ? metadata.authors : [],
    description: metadata.description,
    modified: metadata.modified,
    bookFileName: metadata.bookFileName,
    fileUri: bookFile.uri,
    coverFileName: coverFile?.exists ? metadata.coverFileName : undefined,
    coverUri: coverFile?.exists ? coverFile.uri : undefined,
    mimeType: metadata.mimeType,
    publicationHref: metadata.publicationHref,
    acquisitionHref: metadata.acquisitionHref,
    downloadedAt: metadata.downloadedAt,
    sourceServer: metadata.sourceServer,
  };
}

function inferFileExtension(link: OpdsLink, fallback: string) {
  const pathname = new URL(link.href, "https://example.invalid").pathname;
  const match = pathname.match(/\.[A-Za-z0-9]+$/);

  if (match) {
    return match[0].toLowerCase();
  }

  switch (link.type) {
    case "application/epub+zip":
      return ".epub";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
      return ".jpg";
    default:
      return fallback;
  }
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "book";
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

async function hashFile(file: File) {
  const hasher = new SparkMD5.ArrayBuffer();
  const chunkSize = 1024;
  const bytes = await file.bytes();

  for (let index = -1; index <= 10; index += 1) {
    const start = Math.min(bytes.length, chunkSize << (2 * index));

    if (start >= bytes.length) {
      break;
    }

    const end = Math.min(start + chunkSize, bytes.length);
    hasher.append(bytes.slice(start, end).buffer);
  }

  return hasher.end();
}
