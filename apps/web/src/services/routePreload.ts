import { env } from "../config/env";
import * as BrowsePageModule from "../pages/BrowsePage";
import { sortByImporterOrder } from "../features/browser/browserUtils";
import {
  getStudyProgressCacheKey,
  loadStudyProgressCache,
  persistStudyProgressCacheEntry,
  readStudyProgressCache
} from "../features/career/studyProgressCache";
import { isCompleteWeeklySchedule } from "../features/profile/studyPlan";
import {
  careerWorlds,
  findCareerWorld,
  findTopic
} from "../features/career/careerData";
import type { User } from "../types/auth";
import type { Question } from "../types/question";
import {
  getBrowseRouteValue,
  getPracticeRouteValue,
  getTopicRouteValue
} from "../utils/router";
import { shouldAvoidSpeculativePreloading } from "../utils/networkPreferences";
import { preloadImages } from "../utils/preloadImages";
import {
  getQuestionWindowAssetSources,
  preloadQuestionWindow
} from "../utils/questionAssets";
import { runPreloadQueue } from "../utils/preloadQueue";
import { adminService } from "./adminService";
import { bankService } from "./bankService";
import { examService } from "./examService";
import { getInitiatedApiRequestCount } from "./http";
import { profileService } from "./profileService";
import {
  getPagePreparationInventory,
  getPagePreparation,
  getQuestionPreparation,
  getQuestionPreparationCollections,
  initializePagePreparationInventory,
  resolveQuestionPreparationStatus,
  updatePagePreparation,
  updateQuestionPreparation,
  type QuestionPreparationCollection
} from "./preparationManifest";
import { questionService } from "./questionService";
import {
  isQuestionAssetPersisted,
  waitForQuestionAssetCacheActivation
} from "./questionAssetCache";
import { reviewBankService } from "./reviewBankService";
import { sessionService } from "./sessionService";
import { tutorialService } from "./tutorialService";

type RouteModuleLoader = () => Promise<Record<string, unknown>>;

export type PreparedRouteModule = RouteModuleLoader & {
  isReady: () => boolean;
  read: () => Record<string, unknown>;
};

const createPreparedRouteModule = <T extends Record<string, unknown>>(
  importer: () => Promise<T>
): PreparedRouteModule => {
  let loadedModule: T | null = null;
  let pendingImport: Promise<T> | null = null;

  const load = () => {
    if (loadedModule) return Promise.resolve(loadedModule);
    if (pendingImport) return pendingImport;

    pendingImport = importer()
      .then((module) => {
        loadedModule = module;
        return module;
      })
      .catch((error: unknown) => {
        pendingImport = null;
        throw error;
      });
    return pendingImport;
  };

  return Object.assign(load, {
    isReady: () => loadedModule !== null,
    read: () => {
      if (loadedModule) return loadedModule;
      throw load();
    }
  });
};

const createEagerPreparedRouteModule = <T extends Record<string, unknown>>(
  loadedModule: T
): PreparedRouteModule => Object.assign(
  () => Promise.resolve(loadedModule),
  {
    isReady: () => true,
    read: () => loadedModule
  }
);

export const routeModules = {
  adminAccounts: createPreparedRouteModule(() => import("../features/admin/AdminAccountsPage")),
  adminImport: createPreparedRouteModule(() => import("../features/admin/AdminImportPage")),
  adminImportDetail: createPreparedRouteModule(() => import("../features/admin/AdminImportDetailPage")),
  adminImportHistory: createPreparedRouteModule(() => import("../features/admin/AdminImportHistoryPage")),
  adminOverview: createPreparedRouteModule(() => import("../features/admin/AdminOverviewPage")),
  adminQuestionBank: createPreparedRouteModule(() => import("../features/admin/AdminQuestionBankPage")),
  adminValidation: createPreparedRouteModule(() => import("../features/admin/AdminValidationPage")),
  browse: createEagerPreparedRouteModule(BrowsePageModule),
  career: createPreparedRouteModule(() => import("../pages/CareerPage")),
  exam: createPreparedRouteModule(() => import("../pages/ExamPage")),
  examEntry: createPreparedRouteModule(() => import("../features/exam/ExamEntryDialog")),
  profile: createPreparedRouteModule(() => import("../pages/ProfilePage")),
  review: createPreparedRouteModule(() => import("../pages/ReviewPage")),
  study: createPreparedRouteModule(() => import("../pages/StudyPage")),
  topicWorld: createPreparedRouteModule(() => import("../pages/TopicWorldPage"))
} as const;
const maximumPreparedTopicDestinations = 3;
const maximumPreparedImportDetails = 6;
const maximumPreparedRouteEntries = 96;
const preparedRouteFreshnessMs = 8_000;
const preparedRoutes = new Map<string, number>();
let questionWarmPromise: Promise<void> | null = null;

export type RoutePreparationResult = {
  apiRequests: number;
  codeWasReady: boolean;
  dataWasPrepared: boolean;
};

export type RoutePreloadKind =
  | "admin"
  | "public-static"
  | "student"
  | "unknown";

const getPathname = (path: string) => {
  const pathWithoutHash = path.split("#", 1)[0] ?? path;
  return pathWithoutHash.split("?", 1)[0] || "/";
};

const routeRequiresPreparedData = (path: string, user: User | null) => {
  const pathname = getPathname(path);
  if (
    pathname === "/career" ||
    pathname === "/profile" ||
    pathname === "/setup-profile" ||
    pathname === "/review" ||
    pathname === "/exam" ||
    pathname.startsWith("/browse/") ||
    pathname.startsWith("/practice/")
  ) {
    return true;
  }
  return Boolean(
    user?.isAdmin &&
    pathname.startsWith("/admin") &&
    pathname !== "/admin/import"
  );
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

export const getRouteModuleLoaders = (path: string): PreparedRouteModule[] => {
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

const toManifestAssetSource = (source: string) => {
  try {
    const url = new URL(source);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return source.split(/[?#]/, 1)[0];
  }
};

const getQuestionRouteQuery = (path: string) => {
  const route = getBrowseRouteValue(getPathname(path)) ??
    getPracticeRouteValue(getPathname(path));
  if (!route) return null;

  const topic = findTopic(route.subject, route.topic);
  if (!topic) return null;
  if (
    route.subtopic &&
    !topic.subtopics?.some((subtopic) => subtopic.routeSlug === route.subtopic)
  ) {
    return null;
  }

  return {
    subjectId: route.subject,
    subtopicId: route.subtopic,
    topicId: route.topic
  } as const;
};

const prefetchStudyProgress = async (userId: string) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const cacheKey = getStudyProgressCacheKey(timeZone);
  const cached = readStudyProgressCache(userId, cacheKey);
  if (cached && !cached.isStale) {
    await persistStudyProgressCacheEntry(userId, cacheKey);
    return cached.data;
  }

  const data = await loadStudyProgressCache(
    userId,
    cacheKey,
    () => sessionService.getProgress(timeZone)
  );
  await persistStudyProgressCacheEntry(userId, cacheKey);
  return data;
};

const prefetchQuestionRoute = async (
  path: string,
  options: { assetQuestionCount?: number; preloadAssets?: boolean } = {}
) => {
  const query = getQuestionRouteQuery(path);
  if (!query) return;

  let [response] = await Promise.all([
    questionService.getQuestions(query),
    reviewBankService.getReviewBank()
  ]);

  if (
    response.questions.length === 0 &&
    query.subjectId === "arabic" &&
    query.topicId === "verbal-analogy"
  ) {
    response = await questionService.getQuestions({ subjectId: "arabic" });
  }

  if (options.preloadAssets !== false) {
    await preloadQuestionWindow(
      sortByImporterOrder(response.questions),
      0,
      toMediaSource,
      options.assetQuestionCount ?? 10
    );
  }
};

export const getAllQuestionRoutes = () => careerWorlds.flatMap((world) =>
  world.topics.flatMap((topic) => [
    topic.practiceRoute,
    ...(topic.subtopics?.map((subtopic) => subtopic.route) ?? [])
  ])
);

export const getTopicQuestionRoutes = (path: string) => {
  const pathname = getPathname(path);
  const route = getTopicRouteValue(pathname)
    ?? getBrowseRouteValue(pathname)
    ?? getPracticeRouteValue(pathname);
  if (!route) return [];

  const world = findCareerWorld(route.subject);
  if (!world) return [];

  if (route.topic) {
    const topic = findTopic(route.subject, route.topic);
    if (!topic) return [];
    return topic.subtopics?.map((subtopic) => subtopic.route) ?? [topic.practiceRoute];
  }

  if (route.subject === "arabic") {
    return world.topics.map((topic) => topic.practiceRoute);
  }

  return world.topics.flatMap((topic) => topic.subtopics?.[0]?.route ?? []);
};

export const warmTopicDirectoryData = (
  path: string,
  shouldContinue?: () => boolean
) => {
  if (shouldAvoidSpeculativePreloading()) return Promise.resolve();

  const routes = getTopicQuestionRoutes(path);
  const currentQuestionRoute = getBrowseRouteValue(getPathname(path));
  const startIndex = currentQuestionRoute
    ? Math.max(routes.indexOf(getPathname(path)) + 1, 0)
    : 0;
  const routeCount = currentQuestionRoute
    ? maximumPreparedTopicDestinations - 1
    : getPathname(path) === "/topic/arabic"
      ? routes.length
      : maximumPreparedTopicDestinations;

  return runPreloadQueue(
    routes.slice(startIndex, startIndex + routeCount),
    prefetchQuestionRoute,
    { concurrency: 1, shouldContinue }
  );
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

const prefetchAdminQuestionBank = async () => {
  for (const mode of ["general", "aqsam"] as const) {
    for (const sort of ["asc", "desc"] as const) {
      const firstPage = await adminService.getQuestionBank({
        mode,
        page: 1,
        pageSize: 50,
        sort
      });

      if (firstPage.total > firstPage.pageSize) {
        await adminService.getQuestionBank({
          mode,
          page: 2,
          pageSize: 50,
          sort
        });
      }
    }
  }
};

const prefetchAdminImportHistory = async () => {
  const firstPage = await adminService.getImportJobs(1, 25);
  if (firstPage.pagination.totalPages > 1) {
    await adminService.getImportJobs(2, 25);
  }

  await runPreloadQueue(
    firstPage.jobs.slice(0, maximumPreparedImportDetails),
    (job) => adminService.prefetchImportJob(job.id),
    { concurrency: 2 }
  );
};

const getPagePreparationEntry = (path: string, user: User) => {
  const pathname = getPathname(path);
  const id = pathname === "/career"
    ? "career"
    : pathname === "/study"
      ? "study"
      : pathname === "/profile" || pathname === "/setup-profile"
        ? "profile"
        : pathname === "/review"
          ? "review"
          : pathname === "/exam"
            ? "exam"
            : pathname.startsWith("/topic/")
              ? "topic-directories"
              : pathname === "/admin"
                ? "admin-overview"
                : pathname === "/admin/import"
                  ? "admin-import"
                  : pathname === "/admin/questions"
                    ? "admin-question-bank"
                    : pathname === "/admin/imports" || pathname.startsWith("/admin/imports/")
                      ? "admin-import-history"
                      : pathname === "/admin/accounts"
                        ? "admin-accounts"
                        : pathname === "/admin/validation"
                          ? "admin-validation"
                          : null;
  if (!id) return null;
  return getPagePreparation(id) ??
    getPagePreparationInventory(user).find((entry) => entry.id === id) ??
    null;
};

export const prefetchRouteData = async (path: string, user: User | null) => {
  if (!user) return;

  await initializePagePreparationInventory(user);

  const pathname = getPathname(path);
  const requests: Promise<unknown>[] = [];
  const pageEntry = getPagePreparationEntry(path, user);
  if (pageEntry && pageEntry.status !== "READY") {
    await updatePagePreparation({ ...pageEntry, status: "FETCHING" });
  }

  if (pathname === "/career") {
    requests.push(prefetchStudyProgress(user.id), tutorialService.getProgress());
  } else if (pathname === "/profile" || pathname === "/setup-profile") {
    requests.push(prefetchProfile());
  } else if (pathname === "/review") {
    requests.push(prefetchReview());
  } else if (pathname === "/exam") {
    requests.push(
      examService.getStructure(),
      examService.getHistory(),
      examService.getActiveExam()
    );
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
      requests.push(prefetchAdminQuestionBank());
    } else if (pathname === "/admin/imports") {
      requests.push(prefetchAdminImportHistory());
    } else if (pathname === "/admin/accounts") {
      requests.push(adminService.getAdminAccounts());
    } else {
      const match = /^\/admin\/imports\/([A-Za-z0-9-]+)$/.exec(pathname);
      if (match) requests.push(adminService.getImportJob(match[1]));
    }
  }

  try {
    await Promise.all(requests);
    if (pageEntry) {
      await updatePagePreparation({
        ...pageEntry,
        lastSuccessfulPreparationAt: Date.now(),
        status: "READY"
      });
    }
  } catch (error) {
    if (pageEntry) {
      await updatePagePreparation({
        ...pageEntry,
        lastSuccessfulPreparationAt: null,
        status: "FAILED"
      });
    }
    throw error;
  }
};

export const preloadRouteCode = (path: string) =>
  Promise.all(getRouteModuleLoaders(path).map((loader) => loader()));

export const preloadRoute = async (path: string, user: User | null) => {
  const routeKey = `${user?.id ?? "anonymous"}:${user?.isAdmin ? "admin" : "student"}:${path}`;
  const preparedAt = preparedRoutes.get(routeKey) ?? 0;
  const codeWasReady = getRouteModuleLoaders(path).every((loader) => loader.isReady());
  const dataWasPrepared = !routeRequiresPreparedData(path, user) ||
    Date.now() - preparedAt < preparedRouteFreshnessMs;
  const requestCountBefore = getInitiatedApiRequestCount();

  await Promise.all([
    preloadRouteCode(path),
    prefetchRouteData(path, user)
  ]);

  preparedRoutes.delete(routeKey);
  preparedRoutes.set(routeKey, Date.now());
  if (preparedRoutes.size > maximumPreparedRouteEntries) {
    const oldestKey = preparedRoutes.keys().next().value;
    if (oldestKey) preparedRoutes.delete(oldestKey);
  }

  return {
    apiRequests: getInitiatedApiRequestCount() - requestCountBefore,
    codeWasReady,
    dataWasPrepared
  } satisfies RoutePreparationResult;
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
    "/topic/arabic",
    ...careerWorlds.flatMap((world) => [
      `/topic/${world.id}`,
      ...world.topics.map((topic) => topic.route)
    ]),
    ...getAllQuestionRoutes()
  ];
  if (user.isAdmin) {
    routes.push(
      "/admin",
      "/admin/import",
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

  const routes = [
    "/career",
    "/study",
    "/profile",
    "/exam",
    "/review"
  ];
  if (user.isAdmin) {
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

export const warmPublicRouteCode = (shouldContinue?: () => boolean) =>
  runPreloadQueue(
    [
      routeModules.career,
      routeModules.study,
      routeModules.review,
      routeModules.examEntry,
      routeModules.exam,
      routeModules.profile,
      routeModules.topicWorld,
      routeModules.browse
    ],
    (loader) => loader(),
    { concurrency: 2, shouldContinue }
  );

export const warmAuthorizedRouteData = (
  user: User,
  currentPath: string,
  shouldContinue?: () => boolean
) => runPreloadQueue(
  getAuthorizedWarmDataRoutes(user, currentPath),
  (route) => prefetchRouteData(route, user),
  { concurrency: 1, shouldContinue }
);

export const warmAllQuestionRouteData = (
  shouldContinue?: () => boolean
) => {
  if (questionWarmPromise) return questionWarmPromise;

  const warm = async () => {
    await waitForQuestionAssetCacheActivation();
    const collections = getQuestionPreparationCollections();
    if (shouldContinue?.() === false) return;

    const pendingCollections = collections.filter((collection) => {
      const manifest = getQuestionPreparation(collection.id);
      const cached = questionService.getCachedQuestions(collection.query);
      const persistedAssetsRemainAvailable = manifest?.cachedAssetSources.every(
        (source) => isQuestionAssetPersisted(source)
      ) ?? false;
      return !(
        (manifest?.status === "READY" || manifest?.status === "EMPTY") &&
        cached &&
        !cached.isStale &&
        (manifest.status === "EMPTY" || persistedAssetsRemainAvailable)
      );
    });
    if (pendingCollections.length === 0) return;

    const requiredSubjects = [...new Set(
      pendingCollections.map((collection) => collection.query.subjectId)
    )];
    const [subjectResults] = await Promise.all([
      Promise.allSettled(requiredSubjects.map(async (subjectId) => ({
        response: await questionService.getQuestions({ subjectId }),
        subjectId
      }))),
      reviewBankService.getReviewBank().catch(() => null)
    ]);
    const questionsBySubject = new Map<"arabic" | "math", Question[]>();
    for (const result of subjectResults) {
      if (result.status === "fulfilled") {
        questionsBySubject.set(
          result.value.subjectId,
          result.value.response.questions
        );
      }
    }

    await runPreloadQueue(
      pendingCollections,
      async (collection: QuestionPreparationCollection) => {
        const source = questionsBySubject.get(collection.query.subjectId);
        if (!source) {
          await updateQuestionPreparation(collection.id, {
            lastSuccessfulPreparationAt: null,
            status: "FAILED"
          });
          return;
        }

        await updateQuestionPreparation(collection.id, { status: "FETCHING" });
        let questions = source.filter((question: Question) =>
          question.topicId === collection.query.topicId &&
          (
            collection.query.subtopicId === undefined ||
            question.subtopicId === collection.query.subtopicId
          )
        );
        if (
          questions.length === 0 &&
          collection.query.subjectId === "arabic" &&
          collection.query.topicId === "verbal-analogy"
        ) {
          questions = source.filter((question) => !question.topicId);
        }

        const sortedQuestions = sortByImporterOrder(questions);
        const requiredQuestions = sortedQuestions.slice(0, 10);
        const requiredQuestionIds = requiredQuestions.map((question) => question.id);
        const expectedQuestionCount = requiredQuestions.length;
        const persisted = await questionService.primeQuestionsAndPersist(
          collection.query,
          { questions: sortedQuestions },
          requiredQuestionIds
        );
        const metadataCompleteCount = requiredQuestions.filter((question) =>
          Boolean(
            question.id &&
            question.questionImageUrl &&
            question.subjectId === collection.query.subjectId &&
            question.topicId === collection.query.topicId &&
            (
              collection.query.subtopicId === undefined ||
              question.subtopicId === collection.query.subtopicId
            )
          )
        ).length;
        const assetSources = [...new Set(getQuestionWindowAssetSources(
          requiredQuestions,
          0,
          toMediaSource,
          requiredQuestions.length
        ))];
        const assetResults = await preloadImages(
          assetSources,
          assetSources.length,
          { required: true }
        );
        const successfulAssets = assetResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : []
        );
        const imageReadyCount = successfulAssets.filter(
          (result) => result.loaded
        ).length;
        const persistedAssetCount = successfulAssets.filter(
          (result) => result.persisted
        ).length;
        const failedAssetSources = assetSources.filter((source) =>
          !successfulAssets.some((result) =>
            result.source === source && result.loaded && result.persisted
          )
        ).map(toManifestAssetSource);

        const status = resolveQuestionPreparationStatus({
          expectedAssetCount: assetSources.length,
          expectedQuestionCount,
          imageReadyCount,
          metadataCompleteCount,
          persistedAssetCount,
          questionsPersisted: persisted
        });
        const now = Date.now();
        await updateQuestionPreparation(collection.id, {
          availableQuestionCount: sortedQuestions.length,
          cachedAssetSources: assetSources.map(toManifestAssetSource),
          cachedQuestionIds: requiredQuestionIds,
          expectedAssetCount: assetSources.length,
          expectedQuestionCount,
          failedAssetSources,
          imageReadyCount,
          lastSuccessfulPreparationAt:
            status === "READY" || status === "EMPTY" ? now : null,
          metadataCompleteCount,
          persistedAssetCount,
          persistedQuestionCount: persisted ? expectedQuestionCount : 0,
          retrievedQuestionCount: expectedQuestionCount,
          status
        });
      },
      { concurrency: 2, shouldContinue }
    );
  };

  questionWarmPromise = warm().finally(() => {
    questionWarmPromise = null;
  });
  return questionWarmPromise;
};

