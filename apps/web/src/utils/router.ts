export type RouteSubject = "math" | "arabic";

const isRouteSubject = (value: string): value is RouteSubject => {
  return value === "math" || value === "arabic";
};

export const getCurrentPath = () => window.location.pathname;

export const navigateTo = (path: string) => {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === path) {
    return;
  }

  const commitNavigation = () => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));

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
  const documentWithTransitions = document as Document & {
    startViewTransition?: (callback: () => void) => void;
  };

  if (
    documentWithTransitions.startViewTransition &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    documentWithTransitions.startViewTransition(commitNavigation);
    return;
  }

  commitNavigation();
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
  const match = /^\/topic\/([^/]+)\/([a-z0-9-]+)$/.exec(path);

  if (!match || !isRouteSubject(match[1])) {
    return null;
  }

  return {
    subject: match[1],
    topic: match[2]
  };
};
