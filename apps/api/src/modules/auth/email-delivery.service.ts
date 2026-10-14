import { env } from "../../config/env.js";

type EmailMessage = {
  subject: string;
  text: string;
  to: string;
};

export const sendTransactionalEmail = async (message: EmailMessage) => {
  if (!env.resendApiKey || !env.transactionalEmailFrom) {
    return false;
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: env.transactionalEmailFrom,
        subject: message.subject,
        text: message.text,
        to: [message.to]
      }),
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    console.error("Transactional email provider request failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      provider: "resend"
    });
    return false;
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => null) as {
      name?: unknown;
    } | null;
    console.error("Transactional email provider rejected delivery", {
      errorType: typeof providerError?.name === "string"
        ? providerError.name
        : undefined,
      provider: "resend",
      requestId: response.headers.get("x-request-id") ?? undefined,
      status: response.status
    });
  }

  return response.ok;
};
