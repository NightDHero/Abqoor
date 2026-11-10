import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "../services/authService";
import {
  activateApplicationCache,
  prepareApplicationCache
} from "../services/applicationCache";
import {
  clearQueryCache,
  setQueryCacheScope
} from "../services/queryCache";
import {
  markPerformanceStage,
  startPerformanceInteraction
} from "../services/performanceTelemetry";
import { clearStudyProgressCache } from "../features/career/studyProgressCache";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export const useAuth = () => {
  const authMutationVersionRef = useRef(0);
  const authenticatedUserIdRef = useRef<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((nextUser: User | null) => {
    authMutationVersionRef.current += 1;
    const nextUserId = nextUser?.id ?? null;
    if (
      authenticatedUserIdRef.current &&
      authenticatedUserIdRef.current !== nextUserId
    ) {
      clearStudyProgressCache(authenticatedUserIdRef.current);
    }
    if (!nextUserId) clearStudyProgressCache();
    setQueryCacheScope(
      nextUser ? `user:${nextUser.id}:admin:${nextUser.isAdmin ? "1" : "0"}` : "anonymous"
    );
    authenticatedUserIdRef.current = nextUserId;
    void prepareApplicationCache().then(() => {
      if (authenticatedUserIdRef.current === nextUserId) {
        activateApplicationCache(nextUserId);
      }
    });
    setUserState(nextUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const requestVersion = authMutationVersionRef.current;

    const canApplyBootstrapResult = () =>
      isMounted && authMutationVersionRef.current === requestVersion;

    const loadCurrentUser = async () => {
      startPerformanceInteraction(
        "authentication",
        typeof window === "undefined" ? "bootstrap" : window.location.pathname
      );
      try {
        const [response] = await Promise.all([
          authService.getCurrentUser(),
          prepareApplicationCache()
        ]);
        if (canApplyBootstrapResult()) {
          setQueryCacheScope(
            `user:${response.user.id}:admin:${response.user.isAdmin ? "1" : "0"}`
          );
          authenticatedUserIdRef.current = response.user.id;
          await activateApplicationCache(response.user.id);
          if (canApplyBootstrapResult()) {
            setUserState(response.user);
            markPerformanceStage("authentication-success");
          }
        }
      } catch {
        if (canApplyBootstrapResult()) {
          authenticatedUserIdRef.current = null;
          clearStudyProgressCache();
          setQueryCacheScope("anonymous");
          activateApplicationCache(null);
          clearQueryCache();
          setUserState(null);
        }
      } finally {
        if (canApplyBootstrapResult()) {
          setIsLoading(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      navigateTo("/login");
    }
  };

  return {
    isLoading,
    logout,
    setUser,
    user
  };
};
