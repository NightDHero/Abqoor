import { careerWorlds } from "../features/career/careerData";
import type { User } from "../types/auth";
import type { QuestionQuery } from "./questionService";
import {
  countPersistentAppCacheScope,
  deletePersistentAppCache,
  readPersistentAppCache,
  writePersistentAppCache,
  type PersistentAppCacheRecord
} from "./persistentAppCache";

export type PreparationStatus =
  | "EMPTY"
  | "FAILED"
  | "FETCHING"
  | "NOT_STARTED"
  | "PARTIALLY_READY"
  | "READY";

export type QuestionPreparationCollection = {
  id: string;
  label: string;
  query: Required<Pick<QuestionQuery, "subjectId" | "topicId">> &
    Pick<QuestionQuery, "subtopicId">;
  route: string;
  subjectLabel: string;
  topicLabel: string;
  subtopicLabel?: string;
  type: "subtopic" | "topic";
};

export type QuestionPreparationEntry = QuestionPreparationCollection & {
  availableQuestionCount: number;
  cacheVersion: number;
  cachedAssetSources: string[];
  cachedQuestionIds: string[];
  expectedAssetCount: number;
  expectedQuestionCount: number;
  failedAssetSources: string[];
  imageReadyCount: number;
  lastSuccessfulPreparationAt: number | null;
  metadataCompleteCount: number;
  persistedAssetCount: number;
  persistedQuestionCount: number;
  retrievedQuestionCount: number;
  status: PreparationStatus;
};

export type PagePreparationEntry = {
  cacheKeys: string[];
  id: string;
  lastSuccessfulPreparationAt: number | null;
  requiredEndpoints: string[];
  role: "admin" | "public" | "student";
  route: string;
  status: PreparationStatus;
};

export type PreparationAudit = {
  pages: PagePreparationEntry[];
  questions: QuestionPreparationEntry[];
  role: "admin" | "anonymous" | "student";
  updatedAt: number;
  version: number;
};

export const resolveQuestionPreparationStatus = (input: {
  expectedAssetCount: number;
  expectedQuestionCount: number;
  imageReadyCount: number;
  metadataCompleteCount: number;
  persistedAssetCount: number;
  questionsPersisted: boolean;
}): PreparationStatus => {
  if (input.expectedQuestionCount === 0) {
    return input.questionsPersisted ? "EMPTY" : "PARTIALLY_READY";
  }
  return input.questionsPersisted &&
    input.metadataCompleteCount === input.expectedQuestionCount &&
    input.imageReadyCount === input.expectedAssetCount &&
    input.persistedAssetCount === input.expectedAssetCount
    ? "READY"
    : "PARTIALLY_READY";
};

const manifestVersion = 2;
const manifestTtlMs = 24 * 60 * 60_000;
const persistedRecords = new Map<
  string,
  PersistentAppCacheRecord<QuestionPreparationEntry | PagePreparationEntry>
>();
const questionEntries = new Map<string, QuestionPreparationEntry>();
const pageEntries = new Map<string, PagePreparationEntry>();
let activeScope = "anonymous";
let persistencePromise: Promise<void> | null = null;
let developmentAuditTimer: number | null = null;

const toRecordId = (kind: "page" | "question", id: string) =>
  `${activeScope}::${kind}:${id}`;

const getRole = (): PreparationAudit["role"] => {
  if (!activeScope.startsWith("user:")) return "anonymous";
  return activeScope.endsWith(":admin:1") ? "admin" : "student";
};

export const getQuestionPreparationCollections = () =>
  careerWorlds.flatMap((world) => world.topics.flatMap((topic) => {
    const topicCollection: QuestionPreparationCollection = {
      id: `${world.id}:${topic.routeSlug}:all`,
      label: `${world.label} / ${topic.name}`,
      query: { subjectId: world.id, topicId: topic.routeSlug },
      route: topic.practiceRoute,
      subjectLabel: world.label,
      topicLabel: topic.name,
      type: "topic"
    };
    const subtopicCollections = topic.subtopics?.map((subtopic) => ({
      id: `${world.id}:${topic.routeSlug}:${subtopic.routeSlug}`,
      label: `${world.label} / ${topic.name} / ${subtopic.name}`,
      query: {
        subjectId: world.id,
        subtopicId: subtopic.routeSlug,
        topicId: topic.routeSlug
      },
      route: subtopic.route,
      subjectLabel: world.label,
      subtopicLabel: subtopic.name,
      topicLabel: topic.name,
      type: "subtopic" as const
    })) ?? [];
    return [topicCollection, ...subtopicCollections];
  }));

const createQuestionEntry = (
  collection: QuestionPreparationCollection
): QuestionPreparationEntry => ({
  ...collection,
  availableQuestionCount: 0,
  cacheVersion: manifestVersion,
  cachedAssetSources: [],
  cachedQuestionIds: [],
  expectedAssetCount: 0,
  expectedQuestionCount: 0,
  failedAssetSources: [],
  imageReadyCount: 0,
  lastSuccessfulPreparationAt: null,
  metadataCompleteCount: 0,
  persistedAssetCount: 0,
  persistedQuestionCount: 0,
  retrievedQuestionCount: 0,
  status: "NOT_STARTED"
});

const publishDevelopmentAudit = () => {
  const isDevelopment = (
    import.meta as ImportMeta & { env?: { DEV?: boolean } }
  ).env?.DEV;
  if (!isDevelopment || typeof window === "undefined") return;
  (window as Window & { __ABQOOR_PREPARATION_AUDIT__?: PreparationAudit })
    .__ABQOOR_PREPARATION_AUDIT__ = getPreparationAudit();
  let output = document.querySelector<HTMLOutputElement>(
    "#abqoor-preparation-audit"
  );
  if (!output) {
    output = document.createElement("output");
    output.id = "abqoor-preparation-audit";
    output.hidden = true;
    document.body.append(output);
  }
  output.dataset.manifest = JSON.stringify(getPreparationAudit());

  if (developmentAuditTimer !== null) window.clearTimeout(developmentAuditTimer);
  developmentAuditTimer = window.setTimeout(() => {
    developmentAuditTimer = null;
    const progressScope = activeScope.replace(/:admin:[01]$/, "");
    void Promise.all([
      countPersistentAppCacheScope("assets", activeScope),
      countPersistentAppCacheScope("preparation", activeScope),
      countPersistentAppCacheScope("progress", progressScope),
      countPersistentAppCacheScope("queries", activeScope)
    ]).then(([assets, preparation, progress, queries]) => {
      if (!output || !document.body.contains(output)) return;
      output.dataset.indexeddb = JSON.stringify({
        assets,
        preparation,
        progress,
        queries,
        scope: activeScope
      });
    });
  }, 100);
};

const hydrateActiveScope = () => {
  questionEntries.clear();
  pageEntries.clear();
  const now = Date.now();
  for (const record of persistedRecords.values()) {
    if (
      record.scope !== activeScope ||
      record.expiresAt <= now ||
      record.version !== manifestVersion
    ) {
      continue;
    }
    if (record.key.startsWith("question:")) {
      const entry = record.data as QuestionPreparationEntry;
      questionEntries.set(entry.id, entry);
    } else if (record.key.startsWith("page:")) {
      const entry = record.data as PagePreparationEntry;
      pageEntries.set(entry.id, entry);
    }
  }
  for (const collection of getQuestionPreparationCollections()) {
    if (!questionEntries.has(collection.id)) {
      questionEntries.set(collection.id, createQuestionEntry(collection));
    }
  }
  publishDevelopmentAudit();
};

export const preparePreparationManifestPersistence = () => {
  if (persistencePromise) return persistencePromise;
  persistencePromise = readPersistentAppCache<
    QuestionPreparationEntry | PagePreparationEntry
  >("preparation").then((records) => {
    const now = Date.now();
    for (const record of records) {
      if (
        record.version !== manifestVersion ||
        record.expiresAt <= now ||
        !record.scope.startsWith("user:")
      ) {
        void deletePersistentAppCache("preparation", record.id);
        continue;
      }
      persistedRecords.set(record.id, record);
    }
    hydrateActiveScope();
  });
  return persistencePromise;
};

export const activatePreparationManifest = (scope: string) => {
  activeScope = scope;
  hydrateActiveScope();
};

export const getPreparationManifestScope = () => activeScope;

const persistEntry = async (
  kind: "page" | "question",
  entry: PagePreparationEntry | QuestionPreparationEntry
) => {
  if (!activeScope.startsWith("user:")) return false;
  const now = Date.now();
  const record: PersistentAppCacheRecord<
    PagePreparationEntry | QuestionPreparationEntry
  > = {
    accessedAt: now,
    data: entry,
    expiresAt: now + manifestTtlMs,
    id: toRecordId(kind, entry.id),
    invalidated: entry.status !== "READY" && entry.status !== "EMPTY",
    key: `${kind}:${entry.id}`,
    scope: activeScope,
    updatedAt: now,
    version: manifestVersion
  };
  const written = await writePersistentAppCache("preparation", record);
  if (written) persistedRecords.set(record.id, record);
  return written;
};

export const updateQuestionPreparation = async (
  id: string,
  update: Partial<QuestionPreparationEntry>
) => {
  const collection = getQuestionPreparationCollections().find(
    (candidate) => candidate.id === id
  );
  if (!collection) return false;
  const current = questionEntries.get(id) ?? createQuestionEntry(collection);
  const next = { ...current, ...update };
  questionEntries.set(id, next);
  publishDevelopmentAudit();
  return persistEntry("question", next);
};

export const updatePagePreparation = async (
  entry: PagePreparationEntry
) => {
  pageEntries.set(entry.id, entry);
  publishDevelopmentAudit();
  return persistEntry("page", entry);
};

export const getQuestionPreparation = (id: string) =>
  questionEntries.get(id) ?? null;

export const getPagePreparation = (id: string) => pageEntries.get(id) ?? null;

export const getPreparationAudit = (): PreparationAudit => ({
  pages: [...pageEntries.values()].sort((left, right) =>
    left.route.localeCompare(right.route)
  ),
  questions: getQuestionPreparationCollections().map((collection) =>
    questionEntries.get(collection.id) ?? createQuestionEntry(collection)
  ),
  role: getRole(),
  updatedAt: Date.now(),
  version: manifestVersion
});

export const getPagePreparationInventory = (user: User | null) => {
  const pages: PagePreparationEntry[] = [
    {
      cacheKeys: [],
      id: "landing",
      lastSuccessfulPreparationAt: Date.now(),
      requiredEndpoints: [],
      role: "public",
      route: "/",
      status: "READY"
    },
    {
      cacheKeys: [],
      id: "authentication",
      lastSuccessfulPreparationAt: Date.now(),
      requiredEndpoints: [],
      role: "public",
      route: "/login | /register | /forgot-password | /reset-password | /change-password",
      status: "READY"
    },
    {
      cacheKeys: [],
      id: "not-found",
      lastSuccessfulPreparationAt: Date.now(),
      requiredEndpoints: [],
      role: "public",
      route: "unmatched routes",
      status: "READY"
    }
  ];
  if (!user) return pages;

  pages.push(
    {
      cacheKeys: ["study-progress", "profile:tutorial"],
      id: "career",
      lastSuccessfulPreparationAt: null,
      requiredEndpoints: ["/sessions/progress", "/profile/tutorial"],
      role: "student",
      route: "/career",
      status: "NOT_STARTED"
    },
    {
      cacheKeys: [],
      id: "study",
      lastSuccessfulPreparationAt: Date.now(),
      requiredEndpoints: [],
      role: "student",
      route: "/study",
      status: "READY"
    },
    {
      cacheKeys: ["profile:current", "banks:config", "profile:schedule-preview"],
      id: "profile",
      lastSuccessfulPreparationAt: null,
      requiredEndpoints: ["/profile", "/banks/config", "/profile/schedule-preview"],
      role: "student",
      route: "/profile | /setup-profile",
      status: "NOT_STARTED"
    },
    {
      cacheKeys: ["review:bank"],
      id: "review",
      lastSuccessfulPreparationAt: null,
      requiredEndpoints: ["/review"],
      role: "student",
      route: "/review",
      status: "NOT_STARTED"
    },
    {
      cacheKeys: ["exams:structure", "exams:history", "exams:active"],
      id: "exam",
      lastSuccessfulPreparationAt: null,
      requiredEndpoints: ["/exams/structure", "/exams/history", "/exams/active"],
      role: "student",
      route: "/exam",
      status: "NOT_STARTED"
    },
    {
      cacheKeys: [],
      id: "topic-directories",
      lastSuccessfulPreparationAt: Date.now(),
      requiredEndpoints: [],
      role: "student",
      route: "/topic/:subject | /topic/:subject/:topic",
      status: "READY"
    }
  );

  if (user.isAdmin) {
    pages.push(
      {
        cacheKeys: ["admin:imports:history", "admin:questions", "admin:accounts", "banks:config"],
        id: "admin-overview",
        lastSuccessfulPreparationAt: null,
        requiredEndpoints: ["/admin/import/jobs", "/admin/import/questions", "/admin/accounts", "/banks/config"],
        role: "admin",
        route: "/admin",
        status: "NOT_STARTED"
      },
      {
        cacheKeys: [],
        id: "admin-import",
        lastSuccessfulPreparationAt: Date.now(),
        requiredEndpoints: [],
        role: "admin",
        route: "/admin/import",
        status: "READY"
      },
      {
        cacheKeys: ["admin:questions"],
        id: "admin-question-bank",
        lastSuccessfulPreparationAt: null,
        requiredEndpoints: ["/admin/import/questions"],
        role: "admin",
        route: "/admin/questions",
        status: "NOT_STARTED"
      },
      {
        cacheKeys: ["admin:imports:history", "admin:imports:detail"],
        id: "admin-import-history",
        lastSuccessfulPreparationAt: null,
        requiredEndpoints: ["/admin/import/jobs", "/admin/import/jobs/:id"],
        role: "admin",
        route: "/admin/imports | /admin/imports/:id",
        status: "NOT_STARTED"
      },
      {
        cacheKeys: ["admin:accounts"],
        id: "admin-accounts",
        lastSuccessfulPreparationAt: null,
        requiredEndpoints: ["/admin/accounts"],
        role: "admin",
        route: "/admin/accounts",
        status: "NOT_STARTED"
      },
      {
        cacheKeys: ["admin:validation:summary", "admin:validation:questions"],
        id: "admin-validation",
        lastSuccessfulPreparationAt: null,
        requiredEndpoints: ["/admin/validation/summary", "/admin/validation/questions"],
        role: "admin",
        route: "/admin/validation",
        status: "NOT_STARTED"
      }
    );
  }
  return pages;
};

export const initializePagePreparationInventory = async (user: User | null) => {
  const inventory = getPagePreparationInventory(user);
  for (const entry of inventory) {
    const persisted = pageEntries.get(entry.id);
    if (persisted?.status === "READY") continue;
    pageEntries.set(entry.id, persisted ?? entry);
  }
  publishDevelopmentAudit();
};
