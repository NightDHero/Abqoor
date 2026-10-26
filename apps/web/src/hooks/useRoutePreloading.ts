import { useEffect } from "react";
import {
  preloadRoute,
  warmAuthorizedRouteCode,
  warmAuthorizedRouteData
} from "../services/routePreload";
import type { User } from "../types/auth";
import { shouldAvoidSpeculativePreloading } from "../utils/networkPreferences";

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
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
    void preloadRoute(currentPath, user);
  }, [currentPath, user]);

  useEffect(() => {
    const handleIntent = (event: Event) => {
      const route = getIntentRoute(event.target);
      if (route) void preloadRoute(route, user);
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
    if (!user) return;

    if (shouldAvoidSpeculativePreloading()) return;

    const idleWindow = window as IdleWindow;
    let active = true;
    const warm = () => {
      void warmAuthorizedRouteCode(user, () => active)
        .then(() => warmAuthorizedRouteData(user, currentPath, () => active));
    };

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(warm, { timeout: 1_500 });
      return () => {
        active = false;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(warm, 600);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [currentPath, user]);
};

