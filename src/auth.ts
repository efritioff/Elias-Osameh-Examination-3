const API_BASE = "http://localhost:3001";

export function getAccessToken() {
  return localStorage.getItem("accessToken") ?? "";
}

export function setAccessToken(token: string) {
  if (!token) return;
  localStorage.setItem("accessToken", token);
}

export function clearAccessToken() {
  localStorage.removeItem("accessToken");
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json().catch(() => ({}))) as { accessToken?: string };
    const token = data.accessToken ?? "";

    if (!token) {
      return null;
    }

    setAccessToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const firstRes = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (firstRes.status !== 401) {
    return firstRes;
  }

  const newToken = await refreshAccessToken();
  if (!newToken) {
    clearAccessToken();
    return firstRes;
  }

  const retryHeaders = new Headers(init.headers ?? {});
  retryHeaders.set("Authorization", `Bearer ${newToken}`);

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: "include",
  });
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearAccessToken();
  }
}
