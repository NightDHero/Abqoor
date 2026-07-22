import { useEffect, useState } from "react";
import { authService } from "../services/authService";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (isMounted) {
          setUser(response.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
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
