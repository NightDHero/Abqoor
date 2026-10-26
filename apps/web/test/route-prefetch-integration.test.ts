import assert from "node:assert/strict";
import { test } from "node:test";
import { clearStudyProgressCache } from "../src/features/career/studyProgressCache.js";
import { prefetchRouteData } from "../src/services/routePreload.js";
import { clearQueryCache, setQueryCacheScope } from "../src/services/queryCache.js";
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
  } finally {
    globalThis.fetch = originalFetch;
    setQueryCacheScope("anonymous");
  }
});
