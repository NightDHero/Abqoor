import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import {
  getLandingProgramDestination,
  LandingPage
} from "../src/pages/LandingPage.js";
import type { User } from "../src/types/auth.js";

const user = (overrides: Partial<User> = {}): User => ({
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "student@example.com",
  emailVerified: true,
  id: "student-1",
  isAdmin: false,
  mustChangePassword: false,
  phoneNumber: null,
  phoneVerified: false,
  profileCompleted: true,
  username: "student",
  ...overrides
});

test("landing destinations preserve authenticated and onboarding behavior", () => {
  assert.equal(getLandingProgramDestination(null), "/register");
  assert.equal(getLandingProgramDestination(user()), "/career");
  assert.equal(
    getLandingProgramDestination(user({ profileCompleted: false })),
    "/setup-profile"
  );
  assert.equal(
    getLandingProgramDestination(user({ mustChangePassword: true })),
    "/change-password"
  );
});

test("landing entry buttons render immediately without a disabled bootstrap state", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const entryButtons = markup.match(/<button[^>]+home-(?:primary|secondary)-action[^>]*>/g) ?? [];

  assert.ok(entryButtons.length >= 2);
  assert.equal(entryButtons.some((button) => /\sdisabled(?:=|\s|>)/.test(button)), false);
});
