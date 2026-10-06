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

  const response = await fetch("https://api.resend.com/emails", {
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

  return response.ok;
};
