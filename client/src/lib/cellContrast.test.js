import { describe, expect, it } from 'vitest';
import { getCellLabelStyle } from './cellContrast.js';

describe('calendar label contrast', () => {
  it('uses dark labels for bright custom colors and white labels for dark colors', () => {
    expect(getCellLabelStyle(['#22c55e'])).toEqual({ color: '#000' });
    expect(getCellLabelStyle(['#ff0'])).toEqual({ color: '#000' });
    expect(getCellLabelStyle(['#241035'])).toEqual({ color: '#fff' });
  });

  it('provides a backing when a mixed gradient cannot support one readable text color', () => {
    expect(getCellLabelStyle(['#000000', '#ffffff'])).toEqual({ color: '#fff', backgroundColor: '#0f172a' });
  });

  it('keeps theme colors on days without an explicit family fill', () => {
    expect(getCellLabelStyle([])).toBeUndefined();
  });
});
