import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitAuthForm,
  getPasswordRequirementState,
  validateEmailAddress,
  validateLoginIdentifier,
  validatePasswordConfirmation,
  validatePasswordInput,
  validateVerificationCode
} from "../src/features/auth/authFormValidation.js";
import { validateUsername } from "../src/features/profile/profileFormState.js";

test("name validation accepts Arabic, English, spaces, and exactly 20 characters", () => {
  assert.equal(validateUsername("عبدالله محمد"), "");
  assert.equal(validateUsername("Ahmed Mohammed"), "");
  assert.equal(validateUsername("abcdefghij klmnopqrs"), "");
  assert.notEqual(validateUsername("abcdefghij klmnopqrst"), "");
  assert.notEqual(validateUsername(" اسم صحيح"), "");
});

test("authentication fields update between invalid and valid states", () => {
  assert.notEqual(validateEmailAddress("student@"), "");
  assert.equal(validateEmailAddress("student@example.com"), "");
  assert.notEqual(validateLoginIdentifier("123"), "");
  assert.notEqual(validateLoginIdentifier("0500000001"), "");
  assert.equal(validateLoginIdentifier("student@example.com"), "");
  assert.notEqual(validatePasswordInput("short"), "");
  assert.equal(validatePasswordInput("correct horse battery"), "");
  assert.notEqual(validatePasswordInput("password1234"), "");
  assert.notEqual(validatePasswordConfirmation("password value", "different"), "");
  assert.equal(validatePasswordConfirmation("password value", "password value"), "");
  assert.notEqual(validateVerificationCode("123"), "");
  assert.equal(validateVerificationCode("123456"), "");
});

test("password requirements mirror the server length and common-password rules", () => {
  assert.deepEqual(getPasswordRequirementState("short"), {
    hasMinimumLength: false,
    isNotCommon: true
  });
  assert.deepEqual(getPasswordRequirementState("password1234"), {
    hasMinimumLength: true,
    isNotCommon: false
  });
  assert.deepEqual(getPasswordRequirementState("correct horse battery"), {
    hasMinimumLength: true,
    isNotCommon: true
  });
});

test("submit and Enter guards reject every invalid or unverified form state", () => {
  assert.equal(canSubmitAuthForm({ email: "invalid", password: "" }), false);
  assert.equal(canSubmitAuthForm({ email: "", password: "" }, {
    emailCodeSent: false
  }), false);
  assert.equal(canSubmitAuthForm({ email: "", password: "" }, {
    emailCodeSent: true
  }), true);
});
