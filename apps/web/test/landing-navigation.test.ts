import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import {
  getLandingProgramDestination,
  LandingPage
} from "../src/pages/LandingPage.js";
import { AuthPage } from "../src/features/auth/AuthPage.js";
import { HomeMockExamShowcase } from "../src/features/home/HomeProductVisuals.js";
import { ProfilePage } from "../src/pages/ProfilePage.js";
import type { User } from "../src/types/auth.js";

const user = (overrides: Partial<User> = {}): User => ({
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "student@example.com",
  emailVerified: true,
  id: "student-1",
  isAdmin: false,
  mustChangePassword: false,
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
  assert.match(markup, /<h1 id="home-hero-title">تأسس وتدرب قدرات\.<\/h1>/);
  assert.doesNotMatch(markup.match(/<div class="home-ambient-world"[^>]*>(.*?)<\/div>/)?.[1] ?? "", /<i/);
  const entryButtons = markup.match(/<button[^>]+home-(?:primary|secondary)-action[^>]*>/g) ?? [];

  assert.ok(entryButtons.length >= 2);
  assert.equal(entryButtons.some((button) => /\sdisabled(?:=|\s|>)/.test(button)), false);
});

test("homepage keeps learning content in the program and restores the mock exam interface", () => {
  const landingMarkup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const programMarkup = landingMarkup.match(
    /<section[^>]+id="home-program"[\s\S]*?<\/section>/
  )?.[0] ?? "";
  const mockExamMarkup = renderToStaticMarkup(createElement(HomeMockExamShowcase));

  assert.match(
    programMarkup,
    /عبقور هو برنامج تدريبي لاختبار القدرات للقسمين اللفظي والكمي/
  );
  assert.equal(programMarkup.includes("اللفظفي"), false);
  assert.match(programMarkup, /بتتعلم في برنامجنا:/);
  assert.match(programMarkup, /كيف شكل واجهة الاختبار الحقيقي/);
  assert.match(programMarkup, /اشياء اخرى مانعرفها الا لين جربت تحل/);
  assert.match(
    programMarkup,
    /كل الاسئلة اللي تحلها جت في الاختبار الحقيقي، ما بضيع وقتك/
  );
  assert.equal((landingMarkup.match(/بتتعلم في برنامجنا:/g) ?? []).length, 1);

  assert.match(mockExamMarkup, /home-mini-exam/);
  assert.match(mockExamMarkup, /رقم السؤال/);
  assert.match(mockExamMarkup, /٢٥:٠٠/);
  assert.match(mockExamMarkup, /question-images\/Q-001\.png/);
  assert.match(mockExamMarkup, /حفظ والتالي/);
  assert.equal((mockExamMarkup.match(/aria-label="السؤال /g) ?? []).length, 16);
});

test("landing motion includes an accessible pointer spotlight and reduced-motion fallback", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const css = readFileSync(
    resolve(import.meta.dirname, "../src/public-home.css"),
    "utf8"
  );

  assert.match(markup, /home-pointer-spotlight/);
  assert.match(css, /width:\s*194px/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.home-pointer-spotlight\s*\{\s*display:\s*none/);
});

test("authentication and profile screens contain no phone identity controls", () => {
  const loginMarkup = renderToStaticMarkup(createElement(AuthPage, {
    mode: "login",
    onAuthenticated: () => undefined
  }));
  const registrationMarkup = renderToStaticMarkup(createElement(AuthPage, {
    mode: "register",
    onAuthenticated: () => undefined
  }));
  const profileMarkup = renderToStaticMarkup(createElement(ProfilePage, {
    activeTheme: "dark",
    onLogout: async () => undefined,
    onProfileSaved: () => undefined,
    onThemeChange: () => undefined,
    user: user()
  }));

  for (const markup of [loginMarkup, registrationMarkup, profileMarkup]) {
    assert.equal(markup.includes("الجوال"), false);
    assert.equal(markup.includes('type="tel"'), false);
  }
  assert.match(loginMarkup, /نسيت كلمة المرور/);
  assert.match(registrationMarkup, /البريد الإلكتروني/);
  assert.match(loginMarkup, /تأسس وتدرب قدرات في مكان واحد\./);
  assert.equal(loginMarkup.includes("auth-app-navigation"), false);
  assert.match(
    loginMarkup,
    /class="auth-mode-switch-option selected"[^>]+aria-pressed="true"|aria-pressed="true"[^>]+class="auth-mode-switch-option selected"/
  );
  assert.match(registrationMarkup, />إرسال رمز التحقق<\/button>/);
  assert.match(
    registrationMarkup,
    /سنرسل رمزاً من ٦ أرقام إلى بريدك الإلكتروني/
  );
  assert.equal(registrationMarkup.includes("تحقق من بريدك الإلكتروني"), false);
  assert.equal(loginMarkup.includes("auth-divider"), false);
});
