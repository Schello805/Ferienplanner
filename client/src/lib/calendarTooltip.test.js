import { describe, expect, it } from 'vitest';
import { shouldShowDayTooltip } from './calendarTooltip.js';

describe('shouldShowDayTooltip', () => {
  it('blendet einen reinen Feiertag ohne Zusatzinformation aus', () => {
    expect(shouldShowDayTooltip({
      publicHoliday: 'Maifeiertag',
      schoolHoliday: false,
      isWeekend: false,
      isP1Free: true,
      isP2Free: true,
      p1RecurringLabels: [],
      p2RecurringLabels: [],
      childrenNeedingCare: [],
    })).toBe(false);
  });

  it('zeigt einen Feiertag mit zusätzlichem Urlaubseintrag an', () => {
    expect(shouldShowDayTooltip({
      publicHoliday: 'Maifeiertag',
      p1: true,
      p1RecurringLabels: [],
      p2RecurringLabels: [],
      childrenNeedingCare: [],
    })).toBe(true);
  });

  it('zeigt individuelle freie Tage eines Kindes weiterhin an', () => {
    expect(shouldShowDayTooltip({
      publicHoliday: 'Maifeiertag',
      p1RecurringLabels: [],
      p2RecurringLabels: [],
      childrenNeedingCare: [{ additionalReasons: ['Studientag'] }],
    })).toBe(true);
  });
});
