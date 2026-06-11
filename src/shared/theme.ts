export type AppTheme = 'light' | 'dark';

export const THEME_KEY = 'mortgage-planner-theme';

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark';
}

function parseStoredTheme(value: string | null): AppTheme | undefined {
  if (!value) return undefined;
  if (isAppTheme(value)) return value;

  try {
    const parsed: unknown = JSON.parse(value);
    return isAppTheme(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getStoredTheme(): AppTheme {
  if (typeof localStorage === 'undefined') return 'light';

  try {
    return parseStoredTheme(localStorage.getItem(THEME_KEY)) ?? 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme: AppTheme): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage write errors
  }
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}
