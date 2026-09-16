export async function dbFetch<T>(
  resource: string,
  options: RequestInit & { query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const { query, ...init } = options;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/ems/${resource}${suffix}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Database request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function emitDbChange(resource: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`ems-${resource}-changed`));
  }
}
