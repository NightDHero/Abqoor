export const issueTestRegistrationCode = async (email: string) => {
  const { requestRegistrationCode } = await import(
    "../../src/modules/auth/email-verification.service.js"
  );
  let code = "";
  await requestRegistrationCode(email, async (message) => {
    code = message.text.match(/\b(\d{6})\b/)?.[1] ?? "";
    return Boolean(code);
  });
  if (!code) throw new Error("Test verification code was not captured.");
  return code;
};

export const issueTestPhoneVerificationCode = async (
  phoneNumber: string,
  code = "246810"
) => {
  const { registerTestPhoneVerificationCode } = await import(
    "../../src/modules/auth/phone-verification.service.js"
  );
  registerTestPhoneVerificationCode(phoneNumber, code);
  return code;
};
