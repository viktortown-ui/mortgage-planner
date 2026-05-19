import { normalizeMortgageInput } from './normalizeMortgageInput';
import { STORAGE_KEY } from './resetAppData';
import type { MortgageInput } from '../core/mortgage/types';

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write errors
  }
}

export function loadFromStorage(key: string, fallback: MortgageInput): MortgageInput {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return normalizeMortgageInput(undefined, fallback);
    }

    try {
      return normalizeMortgageInput(JSON.parse(value), fallback);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return normalizeMortgageInput(undefined, fallback);
    }
  } catch {
    return normalizeMortgageInput(undefined, fallback);
  }
}
