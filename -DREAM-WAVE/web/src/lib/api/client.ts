import { getPublicEnv } from "@/config/env";
import { AppError, type AppErrorCode } from "@/lib/errors";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  /** Skip in-flight GET deduplication (default false). */
  dedupe?: boolean;
};

/** Concurrent identical GET requests share one network call. */
const inflightGets = new Map<string, Promise<unknown>>();

function mapStatusToCode(status: number): AppErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 408) return "TIMEOUT";
  return "UNKNOWN";
}

function getApiBaseUrl(): string {
  return getPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
}

async function executeRequest<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    const init: RequestInit = {
      method,
      headers,
      credentials: "omit",
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    if (signal) {
      init.signal = signal;
    }

    response = await fetch(url, init);
  } catch (cause) {
    throw new AppError("Unable to reach the server. Check your connection.", {
      code: "NETWORK",
      status: 0,
      cause,
    });
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Request failed (${response.status})`;

    throw new AppError(message, {
      code: mapStatusToCode(response.status),
      status: response.status,
    });
  }

  return payload as T;
}

/**
 * Typed fetch client for Dream Wave backend API.
 * Concurrent identical GETs are deduped while in flight.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const dedupe = options.dedupe !== false;

  if (method === "GET" && dedupe && !options.signal) {
    const key = `${options.token ?? ""}:${path}`;
    const existing = inflightGets.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const request = executeRequest<T>(path, options).finally(() => {
      inflightGets.delete(key);
    });
    inflightGets.set(key, request);
    return request;
  }

  return executeRequest<T>(path, options);
}
