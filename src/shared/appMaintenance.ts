const APP_CACHE_HINT = 'mortgage-planner';

async function clearPlannerCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.toLowerCase().includes(APP_CACHE_HINT))
      .map((key) => caches.delete(key)),
  );
}

function buildCacheBustedUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('v');
  url.searchParams.set('v', String(Date.now()));
  return url.toString();
}

export async function refreshApplication(): Promise<void> {
  await clearPlannerCaches();

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.scope.toLowerCase().includes(APP_CACHE_HINT))
        .map((registration) => registration.unregister()),
    );
  }

  window.location.href = buildCacheBustedUrl();
}

export async function resetApplicationData(storageKey: string): Promise<void> {
  localStorage.removeItem(storageKey);
  sessionStorage.clear();
  await clearPlannerCaches();
  window.location.reload();
}
