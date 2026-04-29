import { Directory, File, Paths } from "expo-file-system";
import SparkMD5 from "spark-md5";

import { DEFAULT_KOSYNC_CONFIG } from "@/lib/config";

const SETTINGS_DIRECTORY_NAME = "settings";
const SETTINGS_FILE_NAME = "app-settings.json";

export const MIN_READER_FONT_SCALE = 0.8;
export const MAX_READER_FONT_SCALE = 1.8;

export type KosyncSettings = {
  enabled: boolean;
  serverUrl: string;
  username: string;
  userkey: string;
  deviceId: string;
  deviceName: string;
};

export type OpdsServerSettings = {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
};

export type ReaderSettings = {
  fontScale: number;
};

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontScale: 1,
};

export type AppSettings = {
  kosync: KosyncSettings;
  opdsServers: OpdsServerSettings[];
  reader: ReaderSettings;
};

export async function getAppSettings(): Promise<AppSettings> {
  const file = getSettingsFile();

  if (!file.exists) {
    return getDefaultSettings();
  }

  try {
    const parsed = JSON.parse(await file.text()) as Partial<AppSettings>;

    return {
      kosync: normalizeKosyncSettings(parsed.kosync),
      opdsServers: normalizeOpdsServers(parsed.opdsServers),
      reader: normalizeReaderSettings(parsed.reader),
    };
  } catch {
    return getDefaultSettings();
  }
}

export async function saveAppSettings(settings: AppSettings) {
  const directory = getSettingsDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const file = getSettingsFile();
  file.create({ intermediates: true, overwrite: true });
  file.write(
    JSON.stringify(
      {
        kosync: normalizeKosyncSettings(settings.kosync),
        opdsServers: normalizeOpdsServers(settings.opdsServers),
        reader: normalizeReaderSettings(settings.reader),
      },
      null,
      2,
    ),
  );
}

export async function saveKosyncSettings(settings: KosyncSettings) {
  const current = await getAppSettings();
  const next = {
    ...current,
    kosync: normalizeKosyncSettings(settings),
  };
  await saveAppSettings(next);
  return next.kosync;
}

export async function saveOpdsServers(servers: OpdsServerSettings[]) {
  const current = await getAppSettings();
  const next = {
    ...current,
    opdsServers: normalizeOpdsServers(servers),
  };
  await saveAppSettings(next);
  return next.opdsServers;
}

export async function saveReaderSettings(settings: ReaderSettings) {
  const current = await getAppSettings();
  const next = {
    ...current,
    reader: normalizeReaderSettings(settings),
  };
  await saveAppSettings(next);
  return next.reader;
}

export function createOpdsServerSettings(): OpdsServerSettings {
  return {
    id: createDeviceId(),
    name: "New server",
    baseUrl: "https://example.com/opds",
    username: "",
    password: "",
  };
}

export function userkeyFromPassword(password: string) {
  return SparkMD5.hash(password);
}

function getDefaultSettings(): AppSettings {
  return {
    kosync: normalizeKosyncSettings(DEFAULT_KOSYNC_CONFIG),
    opdsServers: [],
    reader: normalizeReaderSettings(DEFAULT_READER_SETTINGS),
  };
}

export function clampReaderFontScale(fontScale: number) {
  if (!Number.isFinite(fontScale)) {
    return DEFAULT_READER_SETTINGS.fontScale;
  }

  return Math.min(Math.max(fontScale, MIN_READER_FONT_SCALE), MAX_READER_FONT_SCALE);
}

function normalizeKosyncSettings(settings?: Partial<KosyncSettings>): KosyncSettings {
  const merged = {
    ...DEFAULT_KOSYNC_CONFIG,
    ...settings,
  };

  return {
    enabled: Boolean(merged.enabled),
    serverUrl: merged.serverUrl.replace(/\/$/, ""),
    username: merged.username,
    userkey: merged.userkey,
    deviceId: merged.deviceId || createDeviceId(),
    deviceName: merged.deviceName || DEFAULT_KOSYNC_CONFIG.deviceName,
  };
}

function normalizeReaderSettings(settings?: Partial<ReaderSettings>): ReaderSettings {
  return {
    fontScale: clampReaderFontScale(settings?.fontScale ?? DEFAULT_READER_SETTINGS.fontScale),
  };
}

function normalizeOpdsServers(
  servers?: readonly Partial<OpdsServerSettings>[],
): OpdsServerSettings[] {
  const normalized = (servers ?? [])
    .map((server) => {
      const baseUrl = server.baseUrl?.trim().replace(/\/+$/, "");

      if (!baseUrl) {
        return null;
      }

      return {
        id: server.id || createDeviceId(),
        name: server.name?.trim() || baseUrl,
        baseUrl,
        username: server.username ?? "",
        password: server.password ?? "",
      };
    })
    .filter((server): server is OpdsServerSettings => server !== null);

  return normalized;
}

function createDeviceId() {
  return SparkMD5.hash(`${Date.now()}:${Math.random()}`);
}

function getSettingsDirectory() {
  return new Directory(Paths.document, SETTINGS_DIRECTORY_NAME);
}

function getSettingsFile() {
  return new File(getSettingsDirectory(), SETTINGS_FILE_NAME);
}
