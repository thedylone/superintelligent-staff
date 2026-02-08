const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const AUTH_TOKEN_KEY = "authToken";

const normalizeBaseUrl = (value?: string) => {
  if (!value) return DEFAULT_API_BASE_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `http://${trimmed.replace(/\/+$/, "")}`;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_SERVER_URL);

export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

type QueryParams = Record<string, string | number | boolean | null | undefined>;

const buildUrl = (path: string, params?: QueryParams) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const parseJsonSafe = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const formatError = (data: unknown, fallback: string) => {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const maybeMessage = (data as { message?: string; error?: string }).message;
    if (maybeMessage) return maybeMessage;
    const maybeError = (data as { message?: string; error?: string }).error;
    if (maybeError) return maybeError;
  }
  return fallback;
};

const withAuthHeaders = (headers?: HeadersInit) => {
  const token = getAuthToken();
  if (!token) return headers;
  return { ...(headers || {}), Authorization: `Bearer ${token}` };
};

export const api = {
  get: async <T>(path: string, params?: QueryParams) => {
    const response = await fetch(buildUrl(path, params), {
      headers: withAuthHeaders(),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(formatError(data, "Request failed"));
    }
    return data as T;
  },
  post: async <T>(path: string, body?: unknown) => {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(formatError(data, "Request failed"));
    }
    return data as T;
  },
  patch: async <T>(path: string, body?: unknown) => {
    const response = await fetch(buildUrl(path), {
      method: "PATCH",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(formatError(data, "Request failed"));
    }
    return data as T;
  },
  upload: async <T>(path: string, formData: FormData) => {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: withAuthHeaders(),
      body: formData,
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(formatError(data, "Request failed"));
    }
    return data as T;
  },
};
