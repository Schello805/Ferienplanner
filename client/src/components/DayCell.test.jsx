import { render, screen } from '@testing-library/react';
import { DayCell } from './DayCell.jsx';

describe('DayCell', () => {
  it('zeigt die Tageszahl direkt in der gültigen Monatszelle', () => {
    render(
      <DayCell
        status={{
          date: new Date(2026, 8, 14),
          dateString: '2026-09-14',
          isWeekend: false,
          schoolHoliday: false,
          publicHoliday: '',
          p1: false,
          p2: false,
          care: false,
          isP1Free: false,
          isP2Free: false,
          requiresCare: false,
          isSelected: false,
          childrenNeedingCare: [],
        }}
        savingDate=""
        p1Color="#22c55e"
        p2Color="#3b82f6"
        careColor="#a855f7"
        onMouseDown={() => {}}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('14')).toHaveClass('day-cell-number');
    expect(screen.getByText('Mo')).toHaveClass('day-cell-weekday');
  });
});
