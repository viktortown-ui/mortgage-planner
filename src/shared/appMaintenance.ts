const APP_SCOPE_HINT = '/mortgage-planner/';

function buildCacheBustedUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('v');
  url.searchParams.set('v', String(Date.now()));
  return url.toString();
}

export async function refreshApplication(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter((registration) => registration.scope.includes(APP_SCOPE_HINT)).map(async (registration) => {
        try { await registration.update(); } catch { /* stay on the cached version while offline */ }
      }));
    } catch {
      // reload the cached application if service worker access is unavailable
    }
  }

  window.location.href = buildCacheBustedUrl();
}

export async function resetApplicationData(storageKey: string): Promise<void> {
  try { localStorage.removeItem(storageKey); } catch { /* ignore storage access errors */ }
  try { sessionStorage.clear(); } catch { /* ignore storage access errors */ }
  window.location.reload();
}
