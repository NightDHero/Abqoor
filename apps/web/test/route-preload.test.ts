import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyRouteForPreload,
  getAuthorizedWarmCodeRoutes,
  getAuthorizedWarmDataRoutes,
  getRouteModuleLoaders
} from "../src/services/routePreload.js";
import type { User } from "../src/types/auth.js";
import { getImagePreloadLimit } from "../src/utils/preloadImages.js";

const user: User = {
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "student@example.com",
  emailVerified: true,
  id: "student-1",
  isAdmin: false,
  mustChangePassword: false,
  profileCompleted: true,
  username: "طالب"
};

test("maps student and admin destinations to bounded lazy route loaders", () => {
  assert.equal(getRouteModuleLoaders("/career").length, 1);
  assert.equal(getRouteModuleLoaders("/browse/math/algebra/equations?question=Q-25").length, 1);
  assert.equal(getRouteModuleLoaders("/exam").length, 2);
  assert.equal(getRouteModuleLoaders("/admin/imports/job-123").length, 1);
  assert.equal(getRouteModuleLoaders("/login").length, 0);
});

test("classifies the complete route families without treating unknown paths as preloadable", () => {
  for (const path of ["/", "/login", "/register", "/forgot-password", "/reset-password"]) {
    assert.equal(classifyRouteForPreload(path), "public-static", path);
  }
  for (const path of [
    "/change-password",
    "/setup-profile",
    "/career",
    "/topic/math",
    "/topic/math/algebra",
    "/browse/math/algebra",
    "/browse/math/algebra/equations",
    "/practice/math/algebra",
    "/study?subject=math",
    "/exam",
    "/review",
    "/profile"
  ]) {
    assert.equal(classifyRouteForPreload(path), "student", path);
  }
  for (const path of [
    "/admin",
    "/admin/validation",
    "/admin/import",
    "/admin/questions",
    "/admin/imports",
    "/admin/imports/job-1",
    "/admin/accounts"
  ]) {
    assert.equal(classifyRouteForPreload(path), "admin", path);
  }
  assert.equal(classifyRouteForPreload("/missing"), "unknown");
});

test("builds bounded warm plans from profile and role state", () => {
  const studentCode = getAuthorizedWarmCodeRoutes(user);
  assert.ok(studentCode.includes("/topic/math"));
  assert.ok(studentCode.includes("/browse/math/arithmetic"));
  assert.ok(!studentCode.includes("/admin"));

  const studentData = getAuthorizedWarmDataRoutes(user, "/career");
  assert.deepEqual(studentData, ["/profile", "/exam", "/review"]);

  const admin = { ...user, isAdmin: true };
  const adminData = getAuthorizedWarmDataRoutes(admin, "/admin/questions");
  assert.ok(adminData.includes("/admin/validation"));
  assert.ok(adminData.includes("/admin/accounts"));
  assert.ok(!adminData.includes("/admin/questions"));

  const onboarding = { ...user, profileCompleted: false };
  assert.deepEqual(getAuthorizedWarmCodeRoutes(onboarding), ["/setup-profile"]);
  assert.deepEqual(getAuthorizedWarmDataRoutes(onboarding, "/login"), ["/setup-profile"]);
});

test("bounds speculative image work for constrained network preferences", () => {
  assert.equal(getImagePreloadLimit(3, null), 3);
  assert.equal(getImagePreloadLimit(3, { effectiveType: "2g" }), 1);
  assert.equal(getImagePreloadLimit(3, { saveData: true }), 0);
});

