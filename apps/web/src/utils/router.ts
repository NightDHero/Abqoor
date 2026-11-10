import {
  markPerformanceStage,
  startPerformanceInteraction
} from "../services/performanceTelemetry";

export type RouteSubject = "math" | "arabic";

let navigationSequence = 0;

const isRouteSubject = (value: string): value is RouteSubject => {
  return value === "math" || value === "arabic";
};

export const getCurrentPath = () => window.location.pathname;

export const navigateTo = (path: string) => {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === path) {
    return;
  }

  startPerformanceInteraction("navigation", path.split(/[?#]/, 1)[0] || "/");
  const navigationStartedAt = performance.now();
  const sequence = ++navigationSequence;

  if (document.documentElement) {
    document.documentElement.dataset.navigationStartedAt = String(
      navigationStartedAt
    );
    document.documentElement.dataset.navigationApiRequestStart =
      document.documentElement.dataset.apiRequestCount ?? "0";
    document.documentElement.dataset.navigationPath = path.split(/[?#]/, 1)[0] || "/";
    document.documentElement.dataset.navigationSequence = String(sequence);
    delete document.documentElement.dataset.navigationContentDurationMs;
  }

  window.history.pushState({ abqoorNavigationSequence: sequence }, "", path);
  markPerformanceStage("url-committed");
  const duration = performance.now() - navigationStartedAt;
  if (document.documentElement) {
    document.documentElement.dataset.navigationDurationMs = duration.toFixed(1);
  }
  window.dispatchEvent(
    new PopStateEvent("popstate", { state: { abqoorProgrammatic: true } })
  );
  const metricName = `abqoor:navigation:${path.split(/[?#]/, 1)[0] || "/"}`;
  performance.clearMeasures(metricName);
  performance.measure(metricName, {
    end: navigationStartedAt + duration,
    start: navigationStartedAt
  });
  const hash = path.includes("#") ? path.slice(path.indexOf("#") + 1) : "";

  if (hash) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }
};

export const getPracticeRouteValue = (path: string) => {
  const match = /^\/practice\/([^/]+)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(
    path
  );

  if (!match || !isRouteSubject(match[1])) {
    return null;
  }

  return {
    subtopic: match[3],
    subject: match[1],
    topic: match[2]
  };
};

export const getBrowseRouteValue = (path: string) => {
  const match = /^\/browse\/([^/]+)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(
    path
  );

  if (!match || !isRouteSubject(match[1])) {
    return null;
  }

  if (match[1] === "arabic" && match[3]) {
    return null;
  }

  return {
    subtopic: match[3],
    subject: match[1],
    topic: match[2]
  };
};

export const getTopicRouteValue = (path: string) => {
  const match = /^\/topic\/([^/]+)(?:\/([a-z0-9-]+))?$/.exec(path);

  if (!match || !isRouteSubject(match[1])) {
    return null;
  }

  return {
    subject: match[1],
    topic: match[2] ?? null
  };
};
