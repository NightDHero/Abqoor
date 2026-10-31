export type RouteSubject = "math" | "arabic";

type NavigationPreparation = {
  apiRequests?: number;
  codeWasReady?: boolean;
  dataWasPrepared?: boolean;
};

type NavigationPreparer = (path: string) => Promise<NavigationPreparation | unknown>;

let navigationPreparer: NavigationPreparer | null = null;
let navigationRequestId = 0;

export const registerNavigationPreparer = (preparer: NavigationPreparer) => {
  navigationPreparer = preparer;
  return () => {
    if (navigationPreparer === preparer) navigationPreparer = null;
  };
};

const isRouteSubject = (value: string): value is RouteSubject => {
  return value === "math" || value === "arabic";
};

export const getCurrentPath = () => window.location.pathname;

export const navigateTo = (path: string) => {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === path) {
    return;
  }

  const navigationStartedAt = performance.now();
  const requestId = ++navigationRequestId;
  let preparation: NavigationPreparation = {};
  const commitNavigation = () => {
    if (requestId !== navigationRequestId) return;

    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    const metricName = `abqoor:navigation:${path.split(/[?#]/, 1)[0] || "/"}`;
    const duration = performance.now() - navigationStartedAt;
    performance.clearMeasures(metricName);
    performance.measure(metricName, {
      end: navigationStartedAt + duration,
      start: navigationStartedAt
    });
    if (document.documentElement) {
      document.documentElement.dataset.navigationApiRequests = String(
        preparation.apiRequests ?? 0
      );
      document.documentElement.dataset.navigationCodeReady = String(
        preparation.codeWasReady ?? true
      );
      document.documentElement.dataset.navigationDataReady = String(
        preparation.dataWasPrepared ?? true
      );
      document.documentElement.dataset.navigationDurationMs = duration.toFixed(1);
      document.documentElement.dataset.navigationPath = path.split(/[?#]/, 1)[0] || "/";
      document.documentElement.dataset.navigationSequence = String(requestId);
    }

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
  if (!navigationPreparer) {
    commitNavigation();
    return;
  }

  void navigationPreparer(path)
    .then((result) => {
      if (typeof result === "object" && result !== null) {
        preparation = result as NavigationPreparation;
      }
    })
    .catch(() => undefined)
    .then(commitNavigation);
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

  if (match[1] === "math" && !match[3]) {
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
