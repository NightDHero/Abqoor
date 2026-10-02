import { env } from "../../config/env.js";

export const sendPasswordResetEmail = async (input: {
  email: string;
  resetUrl: string;
}) => {
  if (!env.resendApiKey || !env.passwordResetEmailFrom) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: env.passwordResetEmailFrom,
      subject: "استعادة كلمة مرور عبقور",
      text: `استخدم الرابط التالي لتعيين كلمة مرور جديدة. تنتهي صلاحية الرابط قريباً:\n${input.resetUrl}`,
      to: [input.email]
    }),
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return response.ok;
};
