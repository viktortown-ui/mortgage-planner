import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, getStoredTheme, setStoredTheme, THEME_KEY } from '../theme';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createDocumentStub() {
  const attributes = new Map<string, string>();
  return {
    documentElement: {
      getAttribute: (key: string) => attributes.get(key) ?? null,
      removeAttribute: (key: string) => attributes.delete(key),
      setAttribute: (key: string, value: string) => attributes.set(key, value),
    },
  };
}

describe('theme storage helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores theme as a plain separate localStorage value', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);

    setStoredTheme('dark');

    expect(storage.getItem(THEME_KEY)).toBe('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('reads legacy JSON-stringified theme values', () => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_KEY, JSON.stringify('dark'));
    vi.stubGlobal('localStorage', storage);

    expect(getStoredTheme()).toBe('dark');
  });

  it('applies the theme before React renders', () => {
    const documentStub = createDocumentStub();
    vi.stubGlobal('document', documentStub);

    applyTheme('dark');

    expect(documentStub.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
