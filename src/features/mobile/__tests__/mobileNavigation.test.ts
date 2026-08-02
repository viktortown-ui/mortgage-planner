import { describe, expect, it } from 'vitest';
import { resolveMobileTab } from '../mobileNavigation';

describe('mobile navigation recovery', () => {
  it('opens the input form when saved parameters cannot be calculated', () => {
    expect(resolveMobileTab('overview', false)).toBe('input');
    expect(resolveMobileTab('table', false)).toBe('input');
  });

  it('keeps the selected section when the calculation is ready', () => {
    expect(resolveMobileTab('charts', true)).toBe('charts');
  });
});
