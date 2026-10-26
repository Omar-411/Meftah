export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Readonly<Record<string, string | number | boolean | undefined | null>>;

export interface HttpClient {
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T = void>(path: string): Promise<T>;
}

interface ClientOptions {
  readonly baseUrl: string;
  readonly getToken: () => Promise<string | null>;
}

/** Thin fetch wrapper used by the HTTP adapters. Runs on the server only, so the token never reaches the browser. */
export function createHttpClient({ baseUrl, getToken }: ClientOptions): HttpClient {
  async function request<T>(method: string, path: string, options: { query?: Query; body?: unknown } = {}): Promise<T> {
    const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }

    const token = await getToken();
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string; fields?: Record<string, string> } | null;
      throw new ApiError(response.status, payload?.message ?? `Erreur ${response.status}`, payload?.fields);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return {
    get: (path, query) => request("GET", path, { query }),
    post: (path, body) => request("POST", path, { body }),
    put: (path, body) => request("PUT", path, { body }),
    patch: (path, body) => request("PATCH", path, { body }),
    delete: (path) => request("DELETE", path),
  };
}
