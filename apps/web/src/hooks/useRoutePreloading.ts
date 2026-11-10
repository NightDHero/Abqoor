import { useEffect } from "react";
import {
  preloadRoute,
  warmAllQuestionRouteData,
  warmAuthorizedRouteCode,
  warmAuthorizedRouteData,
  warmPublicRouteCode,
  warmTopicDirectoryData
} from "../services/routePreload";
import type { User } from "../types/auth";
import { shouldAvoidSpeculativePreloading } from "../utils/networkPreferences";

const scheduleIdleWork = (work: () => void, timeout: number) => {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(work, { timeout });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(work, Math.min(timeout, 1_000));
  return () => globalThis.clearTimeout(timeoutId);
};

const scheduleDeferredIdleWork = (
  work: () => void,
  delay: number,
  timeout: number
) => {
  let cancelIdleWork: () => void = () => undefined;
  const timeoutId = globalThis.setTimeout(() => {
    cancelIdleWork = scheduleIdleWork(work, timeout);
  }, delay);

  return () => {
    globalThis.clearTimeout(timeoutId);
    cancelIdleWork();
  };
};

const getIntentRoute = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;

  const element = target.closest<HTMLElement>("[data-prefetch-route], a[href]");
  if (!element) return null;

  const explicitRoute = element.dataset.prefetchRoute;
  if (explicitRoute?.startsWith("/")) return explicitRoute;

  if (!(element instanceof HTMLAnchorElement)) return null;

  const url = new URL(element.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return `${url.pathname}${url.search}`;
};

export const useRoutePreloading = ({
  currentPath,
  user
}: {
  currentPath: string;
  user: User | null;
}) => {
  useEffect(() => {
    void preloadRoute(currentPath, user).catch(() => undefined);
  }, [currentPath, user]);

  useEffect(() => {
    const handleIntent = (event: Event) => {
      const route = getIntentRoute(event.target);
      if (route) void preloadRoute(route, user).catch(() => undefined);
    };

    document.addEventListener("pointerover", handleIntent, { passive: true });
    document.addEventListener("focusin", handleIntent);
    document.addEventListener("touchstart", handleIntent, { passive: true });

    return () => {
      document.removeEventListener("pointerover", handleIntent);
      document.removeEventListener("focusin", handleIntent);
      document.removeEventListener("touchstart", handleIntent);
    };
  }, [user]);

  useEffect(() => {
    if (user || shouldAvoidSpeculativePreloading()) return;

    let active = true;
    const cancel = scheduleIdleWork(() => {
      void warmPublicRouteCode(() => active);
    }, 350);

    return () => {
      active = false;
      cancel();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const cancelCodeWarm = scheduleDeferredIdleWork(() => {
      void warmAuthorizedRouteCode(user, () => active);
    }, 700, 1_000);
    const cancelMainDataWarm = scheduleDeferredIdleWork(() => {
      void warmAuthorizedRouteData(user, currentPath, () => active);
    }, 1_500, 1_500);
    const cancelQuestionWarm = scheduleDeferredIdleWork(() => {
      void warmAllQuestionRouteData(() => active);
    }, 2_250, 2_000);
    const cancelDataRetry = scheduleDeferredIdleWork(() => {
      void warmAuthorizedRouteData(user, currentPath, () => active);
    }, 20_000, 2_000);
    const cancelQuestionRetry = scheduleDeferredIdleWork(() => {
      void warmAllQuestionRouteData(() => active);
    }, 30_000, 2_000);

    return () => {
      active = false;
      cancelCodeWarm();
      cancelMainDataWarm();
      cancelQuestionWarm();
      cancelDataRetry();
      cancelQuestionRetry();
    };
  }, [user?.id, user?.isAdmin, user?.profileCompleted]);

  useEffect(() => {
    if (!user || shouldAvoidSpeculativePreloading()) return;

    let active = true;
    const cancel = scheduleIdleWork(() => {
      void warmTopicDirectoryData(currentPath, () => active);
    }, 250);

    return () => {
      active = false;
      cancel();
    };
  }, [currentPath, user]);
};

