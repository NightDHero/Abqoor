const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordMinimumLength = 12;

const commonPasswords = new Set([
  "111111111111",
  "123456789012",
  "password1234",
  "qwerty123456",
  "admin12345678",
  "welcome12345",
  "abcdefgh1234"
]);

export const getPasswordRequirementState = (value: string) => ({
  hasMinimumLength: value.length >= passwordMinimumLength,
  isNotCommon: Boolean(value) && !commonPasswords.has(value.trim().toLowerCase())
});

export const validateEmailAddress = (value: string) => {
  if (!value.trim()) return "البريد الإلكتروني مطلوب.";
  return emailPattern.test(value.trim()) ? "" : "أدخل بريداً إلكترونياً صالحاً.";
};

export const validateLoginIdentifier = (value: string) => {
  return validateEmailAddress(value);
};

export const validatePasswordInput = (value: string) => {
  if (!value) return "كلمة المرور مطلوبة.";
  const requirements = getPasswordRequirementState(value);
  if (!requirements.hasMinimumLength || !requirements.isNotCommon) {
    return "كلمة المرور يجب أن تكون قوية وألا تقل عن ١٢ حرفاً.";
  }
  return "";
};

export const validatePasswordConfirmation = (
  password: string,
  confirmation: string
) => {
  if (!confirmation) return "تأكيد كلمة المرور مطلوب.";
  return password === confirmation ? "" : "كلمة المرور وتأكيدها غير متطابقين.";
};

export const validateVerificationCode = (value: string) => {
  if (!value.trim()) return "رمز التحقق مطلوب.";
  return /^\d{6}$/.test(value.trim())
    ? ""
    : "رمز التحقق يجب أن يتكون من ٦ أرقام.";
};

export const canSubmitAuthForm = (
  errors: Record<string, string>,
  requirements: {
    emailCodeSent?: boolean;
  } = {}
) => {
  return Object.values(errors).every((message) => !message) &&
    requirements.emailCodeSent !== false;
};
