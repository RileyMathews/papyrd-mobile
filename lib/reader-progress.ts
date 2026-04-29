import { Directory, File, Paths } from "expo-file-system";

const LIBRARY_DIRECTORY_NAME = "library";
const PROGRESS_FILE_NAME = "progress.json";

export type LocalReaderProgress = {
  cfi: string;
  xpointer?: string;
  fraction: number;
  percentage: number;
  updatedAt: string;
};

export async function getLocalReaderProgress(bookId: string) {
  const file = getProgressFile(bookId);

  if (!file.exists) {
    return null;
  }

  try {
    const progress = JSON.parse(await file.text()) as LocalReaderProgress;

    if (!progress.cfi) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

export async function saveLocalReaderProgress(
  bookId: string,
  progress: Omit<LocalReaderProgress, "updatedAt">,
) {
  const file = getProgressFile(bookId);
  file.create({ intermediates: true, overwrite: true });
  file.write(
    JSON.stringify(
      {
        ...progress,
        updatedAt: new Date().toISOString(),
      } satisfies LocalReaderProgress,
      null,
      2,
    ),
  );
}

function getProgressFile(bookId: string) {
  return new File(
    new Directory(new Directory(Paths.document, LIBRARY_DIRECTORY_NAME), bookId),
    PROGRESS_FILE_NAME,
  );
}
