const STORAGE_KEY = "margined-theme";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage blocked (private mode, sandboxed iframe): fall through */
  }
  return "light"; // the ledger is paper-first
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* the choice just won't persist across visits */
  }
}

export function initTheme() {
  applyTheme(getTheme());
}
