import assert from "node:assert/strict";
import { test } from "node:test";
import { clearStudyProgressCache } from "../src/features/career/studyProgressCache.js";
import {
  prefetchRouteData,
  warmTopicDirectoryData
} from "../src/services/routePreload.js";
import { clearQueryCache, setQueryCacheScope } from "../src/services/queryCache.js";
import { questionService } from "../src/services/questionService.js";
import { profileService } from "../src/services/profileService.js";
import type { User } from "../src/types/auth.js";

const user: User = {
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "student@example.com",
  emailVerified: true,
  id: "prefetch-student",
  isAdmin: false,
  mustChangePassword: false,
  profileCompleted: true,
  username: "طالب"
};

const responseFor = (pathname: string) => {
  if (pathname === "/profile") {
    return {
      profile: {
        profileCompleted: true,
        quantitativeStudyDays: [0, 2, 4],
        studyPlanBankCount: 14,
        studyPlanStartDate: "2026-10-26",
        verbalStudyDays: [1, 3],
        weeklyRestDay: 5,
        weeklyReviewDay: 6
      }
    };
  }
  if (pathname === "/banks/config") {
    return {
      config: {
        availableBankCount: 14,
        mathQuestionsPerBank: 55,
        studyPaceBanksPerDay: 1,
        verbalQuestionsPerBank: 65
      }
    };
  }
  if (pathname === "/profile/tutorial") {
    return {
      tutorial: {
        completedAt: null,
        currentStep: 0,
        dismissedAt: null,
        status: "completed",
        updatedAt: null
      }
    };
  }
  if (pathname === "/review") {
    return { savedQuestions: [], wrongQuestions: [] };
  }
  if (pathname === "/profile/schedule-preview") {
    return { plan: { completionDate: "2027-01-01" } };
  }
  if (pathname === "/exams/active") return { exam: null };
  if (pathname === "/exams/history") return { examResults: [] };
  if (pathname === "/exams/structure") return { structure: {} };
  if (pathname === "/questions") return { questions: [] };
  if (pathname === "/admin/import/questions") {
    return {
      banks: [],
      mode: "general",
      page: 1,
      pageSize: 50,
      questionCounts: { subjects: [] },
      questions: [],
      total: 0
    };
  }
  return {};
};

test("route prefetches make bounded cold requests and avoid warm revisits", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname}${url.search}`);
    return new Response(JSON.stringify(responseFor(url.pathname)), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("prefetch-student");
    clearQueryCache();
    clearStudyProgressCache();

    await Promise.all([
      prefetchRouteData("/career", user),
      prefetchRouteData("/career", user)
    ]);
    assert.equal(calls.filter((path) => path.startsWith("/sessions/progress?")).length, 1);
    assert.equal(calls.filter((path) => path === "/profile/tutorial").length, 1);

    calls.length = 0;
    await prefetchRouteData("/career", user);
    assert.equal(calls.length, 0);

    clearQueryCache();
    await prefetchRouteData("/browse/math/algebra/equations", user);
    assert.deepEqual(calls.sort(), [
      "/questions?subjectId=math&topicId=algebra&subtopicId=equations",
      "/review"
    ]);

    calls.length = 0;
    await prefetchRouteData("/browse/math/algebra/equations", user);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
    clearStudyProgressCache();
  }
});

test("profile intent prepares its reusable config and exact schedule preview", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    return new Response(JSON.stringify(responseFor(url.pathname)), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("profile-prefetch-student");
    clearQueryCache();
    await prefetchRouteData("/profile", user);
    assert.deepEqual(calls.sort(), [
      "/banks/config",
      "/profile",
      "/profile/schedule-preview"
    ]);

    calls.length = 0;
    await profileService.previewSchedule({
      verbalStudyDays: [1, 3],
      weeklyReviewDay: 6,
      studyPlanStartDate: "2026-10-26",
      weeklyRestDay: 5,
      studyPlanBankCount: 14,
      quantitativeStudyDays: [0, 2, 4]
    });
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});

test("exam intent prepares the active attempt, structure, and history once", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    return new Response(JSON.stringify(responseFor(url.pathname)), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("exam-prefetch-student");
    clearQueryCache();
    await prefetchRouteData("/exam", user);
    assert.deepEqual(calls.sort(), [
      "/exams/active",
      "/exams/history",
      "/exams/structure"
    ]);

    calls.length = 0;
    await prefetchRouteData("/exam", user);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});

test("a topic directory prepares its likely subtopics before navigation", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname}${url.search}`);
    return new Response(JSON.stringify(responseFor(url.pathname)), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("topic-prefetch-student");
    clearQueryCache();
    await prefetchRouteData("/topic/math/arithmetic", user);
    assert.deepEqual(calls.sort(), [
      "/questions?subjectId=math&topicId=arithmetic&subtopicId=basic-operations",
      "/review"
    ]);

    calls.length = 0;
    await warmTopicDirectoryData("/topic/math/arithmetic");
    assert.deepEqual(calls.sort(), [
      "/questions?subjectId=math&topicId=arithmetic&subtopicId=fractions-decimals",
      "/questions?subjectId=math&topicId=arithmetic&subtopicId=ratios-proportions"
    ]);

    calls.length = 0;
    await prefetchRouteData(
      "/browse/math/arithmetic/fractions-decimals",
      user
    );
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});

test("topic preloading prepares the legacy verbal fallback before navigation", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const path = `${url.pathname}${url.search}`;
    calls.push(path);

    const response = url.pathname === "/review"
      ? { savedQuestions: [], wrongQuestions: [] }
      : path === "/questions?subjectId=arabic"
        ? {
            questions: [{
              correctAnswer: "A",
              difficulty: 1,
              id: "legacy-verbal-question",
              questionImageUrl: "/question-images/legacy-verbal-question.webp",
              subject: "verbal",
              subjectId: "arabic",
              topic: "غير مصنف"
            }]
          }
        : { questions: [] };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("legacy-topic-prefetch-student");
    clearQueryCache();
    await prefetchRouteData("/topic/arabic", user);
    assert.deepEqual(calls.sort(), [
      "/questions?subjectId=arabic",
      "/questions?subjectId=arabic&topicId=verbal-analogy",
      "/review"
    ]);

    calls.length = 0;
    await prefetchRouteData("/browse/arabic/verbal-analogy", user);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});

test("question cache keys retain difficulty-specific collections", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname}${url.search}`);
    return new Response(JSON.stringify({ questions: [] }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    setQueryCacheScope("question-filter-student");
    clearQueryCache();
    await questionService.getQuestions({
      difficulty: 2,
      subjectId: "math",
      topicId: "arithmetic"
    });
    await questionService.getQuestions({
      difficulty: 4,
      subjectId: "math",
      topicId: "arithmetic"
    });
    await questionService.getQuestions({
      difficulty: 2,
      subjectId: "math",
      topicId: "arithmetic"
    });

    assert.deepEqual(calls, [
      "/questions?subjectId=math&topicId=arithmetic&difficulty=2",
      "/questions?subjectId=math&topicId=arithmetic&difficulty=4"
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});
