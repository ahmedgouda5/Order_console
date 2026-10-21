export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]> | null;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> | null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isAbortedRequest(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    error instanceof Error && error.name === "AbortError"
  );
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE" | "PATCH" | "PUT";
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export async function http<TResponse>(
  path: string,
  { method = "GET", body, signal, headers }: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    signal,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const parsed = (
      payload !== null
        && typeof payload === "object"
        && "message" in payload
    ) ? payload as { message?: unknown; errors?: unknown } : null;

    const message = typeof parsed?.message === "string"
      ? parsed.message
      : `Request failed with status ${response.status}`;

    const fieldErrors = (
      parsed?.errors !== null
        && typeof parsed?.errors === "object"
    ) ? parsed.errors as Record<string, string[]> : null;

    throw new HttpError(response.status, message, fieldErrors);
  }

  return payload as TResponse;
}
