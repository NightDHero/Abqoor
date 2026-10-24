import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import {
  getLandingScrollDuration,
  getLandingScrollProgress,
  LandingPage
} from "../src/pages/LandingPage.js";
import { NotFoundPage } from "../src/pages/NotFoundPage.js";

test("landing renders one permanent cinematic hero without intro state", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const source = readFileSync(resolve(import.meta.dirname, "../src/pages/LandingPage.tsx"), "utf8");
  const css = readFileSync(resolve(import.meta.dirname, "../src/public-home.css"), "utf8");
  const themeCss = readFileSync(resolve(import.meta.dirname, "../src/theme.css"), "utf8");

  assert.match(markup, /id="home-hero"/);
  assert.match(markup, /home-cinematic-hero/);
  assert.match(markup, /home-cinematic-hero-logo/);
  assert.match(markup, /assets\/landing\/abqoor-logo-complete\.png/);
  assert.match(markup, /assets\/mascot\/AbqoorFaceCoolRight\.png/);
  assert.equal(markup.includes("١ / البداية"), false);
  assert.match(markup, /aria-label="الانتقال إلى هذا البرنامج"/);
  assert.equal(markup.includes("home-cinematic-intro"), false);
  assert.equal(markup.includes("home-cinematic-hero-light"), false);
  assert.equal(markup.includes("home-scroll-guide"), false);
  assert.equal(markup.includes("home-journey-guide"), false);
  assert.equal(markup.includes('role="dialog"'), false);
  assert.equal(source.includes("sessionStorage"), false);
  assert.equal((markup.match(/<img[^>]+assets\/mascot\/AbqoorFaceCoolRight/g) ?? []).length, 1);
  assert.doesNotMatch(css, /\.home-cinematic-hero::before\s*\{/);
  assert.match(css, /\.public-home \.home-cinematic-hero\[data-current="true"\]::before\s*\{[\s\S]*?animation:\s*none;/);
  assert.match(themeCss, /linear-gradient\(152deg, #fffdf8 0%, #fff7e8 48%, #f8fbfb 100%\)/);
  assert.match(themeCss, /linear-gradient\(152deg, #03111c 0%, #061d2b 48%, #082735 100%\)/);
});

test("landing progress is navbar-anchored, RTL-anchored, and resize-aware", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const pageSource = readFileSync(resolve(import.meta.dirname, "../src/pages/LandingPage.tsx"), "utf8");
  const css = readFileSync(resolve(import.meta.dirname, "../src/public-home.css"), "utf8");

  assert.match(markup, /home-scroll-progress-frame/);
  assert.match(
    markup,
    /<header class="home-site-nav">[\s\S]*?home-scroll-progress-frame[\s\S]*?<\/header>/
  );
  assert.match(css, /\.home-scroll-progress-frame\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?bottom:\s*-1px;/);
  assert.match(css, /\.home-scroll-progress\s*\{[\s\S]*?transform-origin:\s*right center;/);
  assert.match(css, /transition:\s*transform 150ms/);
  assert.match(pageSource, /new ResizeObserver\(updateScrollState\)/);
  assert.match(pageSource, /new ResizeObserver\(updateNavigationOffset\)/);
  assert.match(pageSource, /--home-nav-height/);
  assert.match(pageSource, /window\.history\.pushState/);
  assert.match(pageSource, /prefers-reduced-motion: reduce/);
  assert.match(pageSource, /requestAnimationFrame\(animateScroll\)/);
  assert.match(pageSource, /window\.scrollTo\(/);
  assert.match(css, /scroll-margin-top:\s*calc\(var\(--home-nav-height\) \+ 12px\)/);
  assert.equal(css.includes("scroll-padding-top"), false);
  assert.equal(css.includes("scroll-behavior: smooth"), false);
  assert.match(markup, /href="\/#home-program"/);
});

test("landing section scrolling uses a visible bounded transition", () => {
  assert.equal(getLandingScrollDuration(0), 520);
  assert.equal(getLandingScrollDuration(10_000), 820);
  assert.equal(getLandingScrollProgress(0), 0);
  assert.equal(getLandingScrollProgress(0.5), 0.5);
  assert.equal(getLandingScrollProgress(1), 1);
});

test("program transition and landing actions contain no obsolete dark or moving treatment", () => {
  const css = readFileSync(resolve(import.meta.dirname, "../src/public-home.css"), "utf8");
  const sharedActionRule = css.match(
    /\.public-home \.home-primary-action,\s*\.public-home \.home-secondary-action\s*\{([^}]*)\}/
  )?.[1] ?? "";

  assert.doesNotMatch(css, /\.home-program::after\s*\{/);
  assert.ok(sharedActionRule.length > 0);
  assert.equal(sharedActionRule.includes("transform"), false);
  assert.doesNotMatch(css, /\.home-primary-action:hover[^}]*transform:/);
  assert.doesNotMatch(css, /\.home-secondary-action:hover[^}]*transform:/);
  assert.match(css, /\.home-brand-closing \.home-secondary-action\s*\{/);
  assert.match(css, /:is\(\.home-primary-action, \.home-secondary-action\):focus-visible/);
});

test("landing advice and closing section use the approved three-part composition", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));

  assert.match(markup, /home-advice-visual/);
  assert.match(markup, /assets\/landing\/abqoor-aha-inward\.png/);
  assert.equal(markup.includes("تسجيل ببرنامج عبقور"), false);
  assert.match(markup, /<footer class="home-brand-closing"/);
  assert.match(markup, /home-brand-closing-logo" src="\/assets\/landing\/abqoor-logo-complete\.png"/);
  assert.equal((markup.match(/href="\/login"/g) ?? []).length >= 2, true);
  assert.equal((markup.match(/href="\/register"/g) ?? []).length >= 2, true);
});

test("systems overview is immediately visible, static, and exposes no topic links", () => {
  const markup = renderToStaticMarkup(createElement(LandingPage, { user: null }));
  const systemsStart = markup.indexOf('id="home-systems"');
  const systemsEnd = markup.indexOf('id="home-advice"');
  const systemsMarkup = markup.slice(systemsStart, systemsEnd);
  const css = readFileSync(resolve(import.meta.dirname, "../src/public-home.css"), "utf8");

  assert.ok(systemsStart >= 0 && systemsEnd > systemsStart);
  assert.equal(systemsMarkup.includes("data-reveal"), false);
  assert.doesNotMatch(systemsMarkup, /<a(?:\s|>)/);
  assert.equal((systemsMarkup.match(/class="home-browser-topic"/g) ?? []).length, 12);
  assert.match(css, /\.public-home \.home-systems \*,[\s\S]*?animation:\s*none !important;[\s\S]*?transition:\s*none !important;/);
  assert.match(css, /\.public-home \.home-systems \.home-browser-topic:hover\s*\{\s*transform:\s*none;/);
});

test("not-found page keeps both recovery actions and expressive mascot artwork", () => {
  const markup = renderToStaticMarkup(createElement(NotFoundPage));
  assert.match(markup, /لم يتم العثور على الصفحة/);
  assert.match(markup, /العودة للرئيسية/);
  assert.match(markup, /الرجوع للخلف/);
  assert.match(markup, /abqoorFaceConfused/);
});
