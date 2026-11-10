type InteractionKind = "authentication" | "navigation" | "question";

export const performanceBudgetsMs = {
  preparedNavigation: 17,
  preparedQuestionChange: 17
} as const;

export type PerformanceInteraction = {
  cacheHits: number;
  cacheMisses: number;
  id: number;
  kind: InteractionKind;
  loadingStates: string[];
  networkCompleted: number;
  networkStarted: number;
  stageNetworkStarted: Record<string, number>;
  stages: Record<string, number>;
  startedAt: number;
  target: string;
};

const maximumRecords = 80;
const records: PerformanceInteraction[] = [];
let activeInteraction: PerformanceInteraction | null = null;
let nextId = 0;

const now = () =>
  typeof performance === "undefined" ? Date.now() : performance.now();

const publish = (interaction: PerformanceInteraction) => {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.dataset.performanceInteraction = JSON.stringify({
    ...interaction,
    durationMs: Number((now() - interaction.startedAt).toFixed(1))
  });
};

export const startPerformanceInteraction = (
  kind: InteractionKind,
  target: string
) => {
  if (
    activeInteraction?.kind === "authentication" &&
    kind === "navigation" &&
    activeInteraction.target === target
  ) {
    markPerformanceStage("navigation-start");
    return activeInteraction.id;
  }

  const startedAt = now();
  activeInteraction = {
    cacheHits: 0,
    cacheMisses: 0,
    id: ++nextId,
    kind,
    loadingStates: [],
    networkCompleted: 0,
    networkStarted: 0,
    stageNetworkStarted: {},
    stages: { start: 0 },
    startedAt,
    target
  };
  records.push(activeInteraction);
  if (records.length > maximumRecords) records.shift();
  publish(activeInteraction);
  return activeInteraction.id;
};

export const markPerformanceStage = (stage: string) => {
  if (!activeInteraction) return;
  activeInteraction.stages[stage] = Number(
    (now() - activeInteraction.startedAt).toFixed(1)
  );
  activeInteraction.stageNetworkStarted[stage] = activeInteraction.networkStarted;
  publish(activeInteraction);
};

export const setPerformanceInteractionTarget = (target: string) => {
  if (!activeInteraction) return;
  activeInteraction.target = target;
  publish(activeInteraction);
};

export const recordPerformanceRequest = (state: "completed" | "started") => {
  if (!activeInteraction) return;
  if (state === "started") activeInteraction.networkStarted += 1;
  else activeInteraction.networkCompleted += 1;
  publish(activeInteraction);
};

export const recordPerformanceCache = (hit: boolean) => {
  if (!activeInteraction) return;
  if (hit) activeInteraction.cacheHits += 1;
  else activeInteraction.cacheMisses += 1;
};

export const recordPerformanceLoadingState = (name: string) => {
  if (!activeInteraction || activeInteraction.loadingStates.includes(name)) return;
  activeInteraction.loadingStates.push(name);
  publish(activeInteraction);
};

export const getPerformanceInteractions = () =>
  records.map((record) => ({
    ...record,
    loadingStates: [...record.loadingStates],
    stageNetworkStarted: { ...record.stageNetworkStarted },
    stages: { ...record.stages }
  }));

