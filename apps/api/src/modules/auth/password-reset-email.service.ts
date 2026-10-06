import { sendTransactionalEmail } from "./email-delivery.service.js";

export const sendPasswordResetEmail = async (input: {
  email: string;
  resetUrl: string;
}) => {
  return sendTransactionalEmail({
    subject: "استعادة كلمة مرور عبقور",
    text: `استخدم الرابط التالي لتعيين كلمة مرور جديدة. تنتهي صلاحية الرابط قريباً:\n${input.resetUrl}`,
    to: input.email
  });
};
