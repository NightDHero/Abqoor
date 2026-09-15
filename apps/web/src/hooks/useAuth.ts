import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "../services/authService";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export const useAuth = () => {
  const authMutationVersionRef = useRef(0);
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((nextUser: User | null) => {
    authMutationVersionRef.current += 1;
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
          setUserState(response.user);
        }
      } catch {
        if (canApplyBootstrapResult()) {
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
