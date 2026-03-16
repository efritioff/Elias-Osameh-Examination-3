const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const API_BASE = env?.BUN_PUBLIC_API_URL ?? env?.VITE_API_URL ?? "http://localhost:3001";
