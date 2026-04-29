import { type KosyncSettings } from "@/lib/settings";

export type KosyncRemoteProgress = {
  document?: string;
  progress?: string;
  percentage?: number;
  timestamp?: number;
  device?: string;
  device_id?: string;
};

type KosyncRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  useAuth?: boolean;
};

export class KosyncClient {
  private readonly settings: KosyncSettings;

  constructor(settings: KosyncSettings) {
    this.settings = {
      ...settings,
      serverUrl: settings.serverUrl.replace(/\/$/, ""),
    };
  }

  async connect(username: string, userkey: string) {
    const response = await this.request("/users/auth", {
      useAuth: true,
      overrideAuth: { username, userkey },
    });

    if (response.ok) {
      return { success: true, message: "Login successful." };
    }

    if (response.status !== 401 && response.status !== 400) {
      return { success: false, message: await getErrorMessage(response) };
    }

    const registerResponse = await this.request("/users/create", {
      method: "POST",
      useAuth: false,
      body: { username, password: userkey },
    });

    if (registerResponse.ok) {
      return { success: true, message: "Registration successful." };
    }

    return { success: false, message: await getErrorMessage(registerResponse) };
  }

  async getProgress(documentHash: string): Promise<KosyncRemoteProgress | null> {
    if (!this.canSync() || !documentHash) {
      return null;
    }

    const response = await this.request(`/syncs/progress/${encodeURIComponent(documentHash)}`);

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const data = (await response.json()) as KosyncRemoteProgress;
    return data.document ? data : null;
  }

  async updateProgress(input: { documentHash: string; progress: string; percentage: number }) {
    if (!this.canSync() || !input.documentHash || !input.progress) {
      return false;
    }

    const response = await this.request("/syncs/progress", {
      method: "PUT",
      body: {
        document: input.documentHash,
        progress: input.progress,
        percentage: input.percentage,
        device: this.settings.deviceName,
        device_id: this.settings.deviceId,
      },
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return true;
  }

  private canSync() {
    return Boolean(
      this.settings.enabled &&
      this.settings.serverUrl &&
      this.settings.username &&
      this.settings.userkey,
    );
  }

  private async request(
    endpoint: string,
    options: KosyncRequestOptions & { overrideAuth?: { username: string; userkey: string } } = {},
  ) {
    const { method = "GET", body, useAuth = true, overrideAuth } = options;
    const username = overrideAuth?.username ?? this.settings.username;
    const userkey = overrideAuth?.userkey ?? this.settings.userkey;

    const headers: Record<string, string> = {
      Accept: "application/vnd.koreader.v1+json",
    };

    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    if (useAuth) {
      headers["X-Auth-User"] = username;
      headers["X-Auth-Key"] = userkey;
    }

    return fetch(`${this.settings.serverUrl}${endpoint}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
  }
}

async function getErrorMessage(response: Response) {
  const body = await response.text();

  if (!body) {
    return `KOSync request failed with HTTP ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? `KOSync request failed with HTTP ${response.status}.`;
  } catch {
    return body;
  }
}
