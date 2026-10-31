import { useEffect, useLayoutEffect } from "react";
import {
  preloadRoute,
  warmAuthorizedRouteCode,
  warmAuthorizedRouteData,
  warmTopicDirectoryData
} from "../services/routePreload";
import type { User } from "../types/auth";
import { shouldAvoidSpeculativePreloading } from "../utils/networkPreferences";
import { registerNavigationPreparer } from "../utils/router";

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

  useLayoutEffect(
    () => registerNavigationPreparer((path) => preloadRoute(path, user)),
    [user]
  );

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
    if (!user) return;

    if (shouldAvoidSpeculativePreloading()) return;

    let active = true;
    void warmTopicDirectoryData(currentPath, () => active);
    void warmAuthorizedRouteCode(user, () => active);
    void warmAuthorizedRouteData(user, currentPath, () => active);

    return () => {
      active = false;
    };
  }, [currentPath, user]);
};

