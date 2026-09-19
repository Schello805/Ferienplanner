import { describe, expect, it } from 'vitest';
import { getAdjacentMonth } from './calendarNavigation.js';

describe('getAdjacentMonth', () => {
  it('wechselt von Dezember in den Januar des Folgejahres', () => {
    expect(getAdjacentMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('wechselt von Januar in den Dezember des Vorjahres', () => {
    expect(getAdjacentMonth(2027, 0, -1)).toEqual({ year: 2026, month: 11 });
  });
});
