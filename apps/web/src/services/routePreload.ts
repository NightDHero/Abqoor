import { env } from "../config/env";
import {
  getStudyProgressCacheKey,
  loadStudyProgressCache,
  readStudyProgressCache
} from "../features/career/studyProgressCache";
import { isCompleteWeeklySchedule } from "../features/profile/studyPlan";
import type { User } from "../types/auth";
import {
  getBrowseRouteValue,
  getPracticeRouteValue
} from "../utils/router";
import { preloadQuestionWindow } from "../utils/questionAssets";
import { runPreloadQueue } from "../utils/preloadQueue";
import { adminService } from "./adminService";
import { bankService } from "./bankService";
import { examService } from "./examService";
import { profileService } from "./profileService";
import { questionService } from "./questionService";
import { reviewBankService } from "./reviewBankService";
import { sessionService } from "./sessionService";
import { tutorialService } from "./tutorialService";

export const routeModules = {
  adminAccounts: () => import("../features/admin/AdminAccountsPage"),
  adminImport: () => import("../features/admin/AdminImportPage"),
  adminImportDetail: () => import("../features/admin/AdminImportDetailPage"),
  adminImportHistory: () => import("../features/admin/AdminImportHistoryPage"),
  adminOverview: () => import("../features/admin/AdminOverviewPage"),
  adminQuestionBank: () => import("../features/admin/AdminQuestionBankPage"),
  adminValidation: () => import("../features/admin/AdminValidationPage"),
  browse: () => import("../pages/BrowsePage"),
  career: () => import("../pages/CareerPage"),
  exam: () => import("../pages/ExamPage"),
  examEntry: () => import("../features/exam/ExamEntryDialog"),
  profile: () => import("../pages/ProfilePage"),
  review: () => import("../pages/ReviewPage"),
  study: () => import("../pages/StudyPage"),
  topicWorld: () => import("../pages/TopicWorldPage")
} as const;

type RouteModuleLoader = () => Promise<Record<string, unknown>>;

export type RoutePreloadKind =
  | "admin"
  | "public-static"
  | "student"
  | "unknown";

const getPathname = (path: string) => {
  const pathWithoutHash = path.split("#", 1)[0] ?? path;
  return pathWithoutHash.split("?", 1)[0] || "/";
};

export const classifyRouteForPreload = (path: string): RoutePreloadKind => {
  const pathname = getPathname(path);
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return "public-static";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (
    pathname === "/change-password" ||
    pathname === "/setup-profile" ||
    pathname === "/career" ||
    pathname === "/study" ||
    pathname === "/exam" ||
    pathname === "/review" ||
    pathname === "/profile" ||
    pathname.startsWith("/topic/") ||
    pathname.startsWith("/browse/") ||
    pathname.startsWith("/practice/")
  ) {
    return "student";
  }
  return "unknown";
};

export const getRouteModuleLoaders = (path: string): RouteModuleLoader[] => {
  const pathname = getPathname(path);

  if (pathname === "/career") return [routeModules.career];
  if (pathname === "/study") return [routeModules.study];
  if (pathname === "/exam") return [routeModules.examEntry, routeModules.exam];
  if (pathname === "/review") return [routeModules.review];
  if (pathname === "/profile") return [routeModules.profile];
  if (pathname.startsWith("/topic/")) return [routeModules.topicWorld];
  if (pathname.startsWith("/browse/") || pathname.startsWith("/practice/")) {
    return [routeModules.browse];
  }
  if (pathname === "/admin") return [routeModules.adminOverview];
  if (pathname === "/admin/validation") return [routeModules.adminValidation];
  if (pathname === "/admin/import") return [routeModules.adminImport];
  if (pathname === "/admin/questions") return [routeModules.adminQuestionBank];
  if (pathname === "/admin/imports") return [routeModules.adminImportHistory];
  if (pathname === "/admin/accounts") return [routeModules.adminAccounts];
  if (/^\/admin\/imports\/[A-Za-z0-9-]+$/.test(pathname)) {
    return [routeModules.adminImportDetail];
  }
  return [];
};

const toMediaSource = (path: string) =>
  path.startsWith("http") ? path : `${env.apiUrl}${path}`;

const prefetchStudyProgress = async (userId: string) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const cacheKey = getStudyProgressCacheKey(timeZone);
  const cached = readStudyProgressCache(userId, cacheKey);
  if (cached && !cached.isStale) return cached.data;

  return loadStudyProgressCache(
    userId,
    cacheKey,
    () => sessionService.getProgress(timeZone)
  );
};

const prefetchQuestionRoute = async (path: string) => {
  const route = getBrowseRouteValue(getPathname(path)) ?? getPracticeRouteValue(getPathname(path));
  if (!route) return;

  const [response] = await Promise.all([
    questionService.getQuestions({
      subjectId: route.subject,
      subtopicId: route.subtopic,
      topicId: route.topic
    }),
    reviewBankService.getReviewBank()
  ]);
  await preloadQuestionWindow(response.questions, 0, toMediaSource, 3);
};

const prefetchReview = async () => {
  const response = await reviewBankService.getReviewBank();
  const items = [...response.wrongQuestions, ...response.savedQuestions];
  await preloadQuestionWindow(items, 0, toMediaSource, 2);
};

const prefetchProfile = async () => {
  const [profileResponse] = await Promise.all([
    profileService.getProfile(),
    bankService.getConfig()
  ]);
  const profile = profileResponse.profile;

  if (
    !profile.studyPlanBankCount ||
    !profile.studyPlanStartDate ||
    !isCompleteWeeklySchedule({
      quantitativeStudyDays: profile.quantitativeStudyDays,
      restDay: profile.weeklyRestDay,
      reviewDay: profile.weeklyReviewDay,
      verbalStudyDays: profile.verbalStudyDays
    })
  ) {
    return;
  }

  await profileService.previewSchedule({
    quantitativeStudyDays: profile.quantitativeStudyDays,
    studyPlanBankCount: profile.studyPlanBankCount,
    studyPlanStartDate: profile.studyPlanStartDate,
    verbalStudyDays: profile.verbalStudyDays,
    weeklyRestDay: profile.weeklyRestDay,
    weeklyReviewDay: profile.weeklyReviewDay
  });
};

export const prefetchRouteData = async (path: string, user: User | null) => {
  if (!user) return;

  const pathname = getPathname(path);
  const requests: Promise<unknown>[] = [];

  if (pathname === "/career") {
    requests.push(prefetchStudyProgress(user.id), tutorialService.getProgress());
  } else if (pathname === "/profile" || pathname === "/setup-profile") {
    requests.push(prefetchProfile());
  } else if (pathname === "/review") {
    requests.push(prefetchReview());
  } else if (pathname === "/exam") {
    requests.push(examService.getStructure(), examService.getHistory());
  } else if (pathname.startsWith("/browse/") || pathname.startsWith("/practice/")) {
    requests.push(prefetchQuestionRoute(path));
  }

  if (pathname.startsWith("/admin") && user.isAdmin) {
    if (pathname === "/admin") {
      requests.push(
        adminService.getImportJobs(),
        adminService.getQuestionBank({ page: 1, pageSize: 1 }),
        adminService.getAdminAccounts(),
        bankService.getConfig()
      );
    } else if (pathname === "/admin/validation") {
      requests.push(
        adminService.getValidationSummary(),
        adminService.getValidationQuestions()
      );
    } else if (pathname === "/admin/questions") {
      requests.push(adminService.getQuestionBank({
        mode: "general",
        page: 1,
        pageSize: 50,
        sort: "asc"
      }));
    } else if (pathname === "/admin/imports") {
      requests.push(adminService.getImportJobs(1, 25));
    } else if (pathname === "/admin/accounts") {
      requests.push(adminService.getAdminAccounts());
    } else {
      const match = /^\/admin\/imports\/([A-Za-z0-9-]+)$/.exec(pathname);
      if (match) requests.push(adminService.getImportJob(match[1]));
    }
  }

  await Promise.allSettled(requests);
};

export const preloadRouteCode = (path: string) =>
  Promise.allSettled(getRouteModuleLoaders(path).map((loader) => loader()));

export const preloadRoute = async (path: string, user: User | null) => {
  await Promise.allSettled([
    preloadRouteCode(path),
    prefetchRouteData(path, user)
  ]);
};

export const getAuthorizedWarmCodeRoutes = (user: User) => {
  if (!user.profileCompleted) return ["/setup-profile"];

  const routes = [
    "/career",
    "/study",
    "/review",
    "/exam",
    "/profile",
    "/topic/math",
    "/browse/math/arithmetic"
  ];
  if (user.isAdmin) {
    routes.push(
      "/admin",
      "/admin/questions",
      "/admin/imports",
      "/admin/accounts",
      "/admin/validation"
    );
  }
  return routes;
};

export const getAuthorizedWarmDataRoutes = (
  user: User,
  currentPath: string
) => {
  if (!user.profileCompleted) return ["/setup-profile"];

  const routes = ["/career", "/profile", "/exam", "/review"];
  if (user.isAdmin && getPathname(currentPath).startsWith("/admin")) {
    routes.push(
      "/admin",
      "/admin/import",
      "/admin/questions",
      "/admin/imports",
      "/admin/accounts",
      "/admin/validation"
    );
  }

  const currentPathname = getPathname(currentPath);
  return [...new Set(routes)].filter((route) => route !== currentPathname);
};

export const warmAuthorizedRouteCode = (
  user: User,
  shouldContinue?: () => boolean
) => {
  const loaders = getAuthorizedWarmCodeRoutes(user)
    .flatMap(getRouteModuleLoaders);
  if (user.isAdmin && user.profileCompleted) {
    loaders.push(routeModules.adminImportDetail);
  }

  return runPreloadQueue(
    [...new Set(loaders)],
    (loader) => loader(),
    { concurrency: 2, shouldContinue }
  );
};

export const warmAuthorizedRouteData = (
  user: User,
  currentPath: string,
  shouldContinue?: () => boolean
) => runPreloadQueue(
  getAuthorizedWarmDataRoutes(user, currentPath),
  (route) => prefetchRouteData(route, user),
  { concurrency: 1, shouldContinue }
);

