import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const navigatorSource = readSource("../src/features/browser/QuestionNavigator.tsx");
const questionModeSource = readSource("../src/features/browser/QuestionMode.tsx");
const studyQuestionSource = readSource("../src/features/study/StudyQuestion.tsx");
const positionSource = readSource("../src/components/ui/QuestionPosition.tsx");
const solvingStyles = readSource("../src/features/browser/solving-workspace.css");
const immersiveSource = readSource("../src/components/ui/ImmersiveQuestionFeed.tsx");
const immersiveStyles = readSource("../src/components/ui/immersive-question-feed.css");

test("question selector exposes a keyboard-operable RTL listbox", () => {
  assert.match(navigatorSource, /aria-haspopup="listbox"/);
  assert.match(navigatorSource, /role="listbox"/);
  assert.match(navigatorSource, /role="option"/);
  assert.match(navigatorSource, /event\.key === "Escape"/);
  assert.match(navigatorSource, /event\.key === "ArrowDown"/);
  assert.match(solvingStyles, /\.question-finder-menu\s*\{[^}]*overflow-y:\s*auto;/s);
});

test("immersive navigation has opposite directional entrances and reduced-motion safety", () => {
  assert.match(immersiveSource, /data-motion-direction=\{moveDirection/);
  assert.match(immersiveStyles, /@keyframes immersive-question-enter-next[\s\S]*translateX\(-28px\)/);
  assert.match(immersiveStyles, /@keyframes immersive-question-enter-previous[\s\S]*translateX\(28px\)/);
  assert.match(
    immersiveStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none;/
  );
});

test("answered options reserve outcome space and mobile navigation uses equal insets", () => {
  assert.match(questionModeSource, /isAnswered \? "is-locked"/);
  assert.match(immersiveSource, /isAnswered \|\| answerState\.isSubmitting \? "is-locked"/);
  assert.match(solvingStyles, /\.answer-option\.has-outcome\s*\{[^}]*padding-inline-end:/s);
  assert.match(immersiveStyles, /\.immersive-answer-option\.has-outcome\s*\{[^}]*padding-inline-end:/s);
  assert.match(
    solvingStyles,
    /--mobile-navigation-inset:[^;]+;[\s\S]*margin:\s*0 var\(--mobile-navigation-inset\) var\(--mobile-navigation-inset\);/
  );
});

test("normal question modes share a compact current-first position indicator", () => {
  assert.match(navigatorSource, /<QuestionPosition[\s\S]*totalQuestions=\{questions\.length\}/);
  assert.doesNotMatch(navigatorSource, /\{toArabicNumber\(currentIndex \+ 1\)\} \/ \{toArabicNumber\(questions\.length\)\}/);
  assert.match(questionModeSource, /<QuestionPosition currentIndex=\{currentIndex\} totalQuestions=\{totalQuestions\} \/>/);
  assert.match(studyQuestionSource, /<QuestionPosition currentIndex=\{currentIndex\} totalQuestions=\{totalQuestions\} \/>/);
  assert.match(positionSource, /<strong>\{toArabicNumber\(currentQuestion\)\}<\/strong>/);
  assert.match(positionSource, /<small>من \{toArabicNumber\(totalQuestions\)\}<\/small>/);
  assert.match(solvingStyles, /\.question-position strong\s*\{[^}]*font-size:\s*clamp\(1\.35rem,/s);
});

test("answer dock gives the primary next action more room without crowding options", () => {
  assert.match(
    solvingStyles,
    /\.solving-answer-dock\s*\{[^}]*padding:\s*clamp\(12px, 1\.4vw, 20px\)/s
  );
  assert.match(
    solvingStyles,
    /button\.question-next-button\s*\{[^}]*min-height:\s*clamp\(58px, 5vw, 64px\);/s
  );
});
