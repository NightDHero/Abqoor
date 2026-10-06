const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+?966|00966|0)?5\d{8}$/;

export const validateEmailAddress = (value: string) => {
  if (!value.trim()) return "البريد الإلكتروني مطلوب.";
  return emailPattern.test(value.trim()) ? "" : "أدخل بريداً إلكترونياً صالحاً.";
};

export const validatePhoneNumber = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!compact) return "رقم الجوال مطلوب.";
  return phonePattern.test(compact) ? "" : "أدخل رقم جوال صالحاً.";
};

export const validateLoginIdentifier = (value: string) => {
  if (!value.trim()) return "البريد الإلكتروني أو رقم الجوال مطلوب.";
  return value.includes("@")
    ? validateEmailAddress(value)
    : validatePhoneNumber(value);
};

export const validatePasswordInput = (value: string) => {
  if (!value) return "كلمة المرور مطلوبة.";
  return value.length >= 12 ? "" : "كلمة المرور يجب ألا تقل عن ١٢ حرفاً.";
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

export const validatePhoneVerificationCode = (value: string) => {
  if (!value.trim()) return "رمز تحقق الجوال مطلوب.";
  return /^\d{4,10}$/.test(value.trim())
    ? ""
    : "أدخل رمز تحقق الجوال الصحيح.";
};

export const canSubmitAuthForm = (
  errors: Record<string, string>,
  requirements: {
    emailCodeSent?: boolean;
    phoneCodeSent?: boolean;
  } = {}
) => {
  return Object.values(errors).every((message) => !message) &&
    requirements.emailCodeSent !== false &&
    requirements.phoneCodeSent !== false;
};
