import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitAuthForm,
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
  assert.notEqual(validatePasswordConfirmation("password value", "different"), "");
  assert.equal(validatePasswordConfirmation("password value", "password value"), "");
  assert.notEqual(validateVerificationCode("123"), "");
  assert.equal(validateVerificationCode("123456"), "");
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
