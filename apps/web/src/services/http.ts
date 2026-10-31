import { env } from "../config/env";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown
  ) {
    super(message);
  }
}

export const apiRequestTimeouts = {
  standard: 60_000,
  upload: 30 * 60_000
} as const;

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

export const runWithRequestDeadline = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal | null; timeoutMs: number }
) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (caughtError) {
    if (timedOut) {
      throw new HttpError(
        "استغرق الاتصال بالخادم وقتاً أطول من المتوقع. تحقق من اتصالك ثم أعد المحاولة.",
        408,
        null
      );
    }
    throw caughtError;
  } finally {
    globalThis.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
};

const readResponseJson = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
};

const getErrorMessage = (data: unknown, fallback: string) => {
  return typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
    ? data.message
    : fallback;
};

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {}
) => {
  const {
    signal: callerSignal,
    timeoutMs = apiRequestTimeouts.standard,
    ...requestOptions
  } = options;
  return runWithRequestDeadline(async (signal) => {
    const response = await fetch(`${env.apiUrl}${path}`, {
      credentials: "include",
      ...requestOptions,
      headers:
        requestOptions.body instanceof FormData
          ? requestOptions.headers
          : {
              "Content-Type": "application/json",
              ...requestOptions.headers
            },
      signal
    });
    const data = await readResponseJson(response);

    if (!response.ok) {
      throw new HttpError(
        getErrorMessage(data, "تعذر تنفيذ الطلب."),
        response.status,
        data
      );
    }

    return data as T;
  }, { signal: callerSignal, timeoutMs });
};
