import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "../services/authService";
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
    authenticatedUserIdRef.current = nextUserId;
    setUserState(nextUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const requestVersion = authMutationVersionRef.current;

    const canApplyBootstrapResult = () =>
      isMounted && authMutationVersionRef.current === requestVersion;

    const loadCurrentUser = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (canApplyBootstrapResult()) {
          authenticatedUserIdRef.current = response.user.id;
          setUserState(response.user);
        }
      } catch {
        if (canApplyBootstrapResult()) {
          authenticatedUserIdRef.current = null;
          clearStudyProgressCache();
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
