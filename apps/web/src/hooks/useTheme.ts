import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
  persistThemePreference,
  themeStorageKey,
  type ThemePreference
} from "../theme/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const storedTheme = getStoredThemePreference();

    applyThemePreference(storedTheme);

    return storedTheme;
  });

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== themeStorageKey) {
        return;
      }

      const nextTheme = getStoredThemePreference();
      setThemeState(nextTheme);
      applyThemePreference(nextTheme);
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    persistThemePreference(nextTheme);
    setThemeState(nextTheme);
  }, []);

  return {
    setTheme,
    theme
  };
}
