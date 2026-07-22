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
  options: RequestInit = {}
) => {
  const response = await fetch(`${env.apiUrl}${path}`, {
    credentials: "include",
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : {
            "Content-Type": "application/json",
            ...options.headers
          }
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
};
