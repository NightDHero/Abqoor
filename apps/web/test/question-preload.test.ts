import assert from "node:assert/strict";
import { test } from "node:test";
import { getQuestionWindowAssetSources } from "../src/utils/questionAssets.js";

test("prepares only the current and next two questions with their answer assets", () => {
  const questions = [
    { questionImageUrl: "/q1.png", optionImageUrls: { A: "/q1-a.png" } },
    { answerImageUrls: { B: "/q2-b.png" }, questionImageUrl: "/q2.png" },
    { questionImageUrl: "/q3.png" },
    { questionImageUrl: "/q4.png" }
  ];

  assert.deepEqual(
    getQuestionWindowAssetSources(questions, 1, (path) => `api${path}`, 3),
    ["api/q2.png", "api/q2-b.png", "api/q3.png", "api/q4.png"]
  );
});
