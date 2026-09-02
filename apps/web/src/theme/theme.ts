export type ThemePreference = "light" | "dark";

export const defaultThemePreference: ThemePreference = "light";
export const themeStorageKey = "abqoor.theme";

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark";

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return defaultThemePreference;
  }

  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);

    return isThemePreference(storedTheme)
      ? storedTheme
      : defaultThemePreference;
  } catch {
    return defaultThemePreference;
  }
};

export const applyThemePreference = (theme: ThemePreference) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export const persistThemePreference = (theme: ThemePreference) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Theme selection is still applied for this session if storage is unavailable.
    }
  }

  applyThemePreference(theme);
};

export const initializeThemePreference = () => {
  const theme = getStoredThemePreference();

  applyThemePreference(theme);

  return theme;
};
