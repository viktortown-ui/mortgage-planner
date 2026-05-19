export const STORAGE_KEY = 'mortgage-planner-v1';

export async function resetAppData(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage access errors
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore storage access errors
  }

  if (typeof caches !== 'undefined') {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    } catch {
      // ignore cache API errors
    }
  }
}
