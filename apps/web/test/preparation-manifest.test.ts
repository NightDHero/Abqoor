import assert from "node:assert/strict";
import { test } from "node:test";
import { topicTaxonomy } from "../../api/src/modules/learning-taxonomy/taxonomy.js";
import { careerWorlds } from "../src/features/career/careerData.js";
import { sortByImporterOrder } from "../src/features/browser/browserUtils.js";
import {
  getQuestionPreparationCollections,
  resolveQuestionPreparationStatus
} from "../src/services/preparationManifest.js";
import { getAllQuestionRoutes } from "../src/services/routePreload.js";
import { preloadImages } from "../src/utils/preloadImages.js";

test("frontend question destinations exactly match the backend taxonomy", () => {
  const frontend = careerWorlds.flatMap((world) =>
    world.topics.map((topic) => ({
      name: topic.name,
      slug: topic.routeSlug,
      subject: world.id,
      subtopics: topic.subtopics?.map((subtopic) => ({
        name: subtopic.name,
        slug: subtopic.routeSlug
      })) ?? []
    }))
  );
  const backend = topicTaxonomy.map((topic) => ({
    name: topic.displayNameAr,
    slug: topic.slug,
    subject: topic.subject,
    subtopics: topic.subtopics.map((subtopic) => ({
      name: subtopic.displayNameAr,
      slug: subtopic.slug
    }))
  }));

  assert.deepEqual(frontend, backend);
});

test("the manifest inventories every topic and every subtopic separately", () => {
  const collections = getQuestionPreparationCollections();
  assert.equal(collections.length, 42);
  assert.equal(collections.filter((entry) => entry.type === "topic").length, 12);
  assert.equal(collections.filter((entry) => entry.type === "subtopic").length, 30);
  assert.equal(new Set(collections.map((entry) => entry.id)).size, 42);
  assert.equal(new Set(collections.map((entry) => entry.route)).size, 42);
  assert.deepEqual(
    new Set(collections.map((entry) => entry.route)),
    new Set(getAllQuestionRoutes())
  );
});

test("READY requires persisted questions, complete metadata, and every asset", () => {
  const complete = {
    expectedAssetCount: 10,
    expectedQuestionCount: 10,
    imageReadyCount: 10,
    metadataCompleteCount: 10,
    persistedAssetCount: 10,
    questionsPersisted: true
  };
  assert.equal(resolveQuestionPreparationStatus(complete), "READY");
  assert.equal(
    resolveQuestionPreparationStatus({ ...complete, persistedAssetCount: 9 }),
    "PARTIALLY_READY"
  );
  assert.equal(
    resolveQuestionPreparationStatus({ ...complete, metadataCompleteCount: 9 }),
    "PARTIALLY_READY"
  );
  assert.equal(
    resolveQuestionPreparationStatus({ ...complete, questionsPersisted: false }),
    "PARTIALLY_READY"
  );
  assert.equal(
    resolveQuestionPreparationStatus({
      ...complete,
      expectedAssetCount: 0,
      expectedQuestionCount: 0,
      imageReadyCount: 0,
      metadataCompleteCount: 0,
      persistedAssetCount: 0
    }),
    "EMPTY"
  );
});

test("required preparation does not drop assets under Save-Data", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { connection: { effectiveType: "2g", saveData: true } }
  });

  try {
    const sources = Array.from({ length: 10 }, (_, index) =>
      `https://example.com/question-images/Q-${index + 1}.webp`
    );
    assert.equal((await preloadImages(sources, 10)).length, 0);
    assert.equal(
      (await preloadImages(sources, 10, { required: true })).length,
      10
    );
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
});

test("prepared collections use the destination's authoritative importer order", () => {
  const sorted = sortByImporterOrder([
    { bankQuestionNumber: 25, difficulty: 1, id: "random-b", questionImageUrl: "/b.webp", subject: "quantitative", topic: "الحساب" },
    { bankQuestionNumber: 3, difficulty: 1, id: "random-a", questionImageUrl: "/a.webp", subject: "quantitative", topic: "الحساب" },
    { bankQuestionNumber: 41, difficulty: 1, id: "random-c", questionImageUrl: "/c.webp", subject: "quantitative", topic: "الحساب" }
  ]);
  assert.deepEqual(sorted.map((question) => question.bankQuestionNumber), [3, 25, 41]);
});
