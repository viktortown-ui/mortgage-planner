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
}
