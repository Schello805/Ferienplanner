import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarToolbar } from './CalendarToolbar';

const renderToolbar = () => render(
    <CalendarToolbar
        year={2026}
        setYear={vi.fn()}
        stats={{
            p1: 1,
            p1Net: 1,
            p2: 0,
            p2Net: 0,
            care: 0,
            totalNetHolidays: 63,
            unattended: 2,
            unattendedDates: ['2026-11-18', '2026-12-03']
        }}
        p1Color="#22c55e"
        p2Color="#ec4899"
        careColor="#a855f7"
        showPlanner={false}
        setShowPlanner={vi.fn()}
        readOnly={false}
        shareMode={false}
    />
);

describe('CalendarToolbar', () => {
    it('shows unattended dates when the warning is clicked and closes them with Escape', () => {
        renderToolbar();

        const warning = screen.getByRole('button', { name: 'Warnung: 2 unbetreut. Tage anzeigen' });
        expect(screen.queryByRole('dialog', { name: 'Unbetreute Tage' })).not.toBeInTheDocument();

        fireEvent.click(warning);
        expect(screen.getByText('18.11.2026 (Mi)')).toBeInTheDocument();
        expect(screen.getByText('03.12.2026 (Do)')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Unbetreute Tage' })).not.toBeInTheDocument();
    });
});
