import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { CalendarToolbar } from './CalendarToolbar';
import { CalendarLegend } from './CalendarLegend';
import { DayCell } from './DayCell';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const CalendarView = ({ 
    p1Color, 
    p2Color, 
    careColor, 
    setP1Color, 
    setP2Color, 
    setCareColor,
    p1DaysOff = [], // Array of day indices (0-6)
    p2DaysOff = []
}) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [holidays, setHolidays] = useState({ public: [], school: [] });
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(true);
    
    // Cache for holiday data to avoid redundant API calls
    const holidayCache = React.useRef({});

    // Range Input State (Lifted)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [userId, setUserId] = useState('p1');
    const [isDragging, setIsDragging] = useState(false);

    // Optimize vacation lookup using Map (O(1))
    const vacationsMap = useMemo(() => {
        const map = new Map();
        vacations.forEach(v => map.set(v.date, v.userId));
        return map;
    }, [vacations]);

    // Fetch Data Function
    const fetchData = useCallback(async () => {
        // Don't set loading true here to avoid flickering on updates
        // setLoading(true); 
        try {
            // Check cache first
            if (holidayCache.current[year]) {
                setHolidays(holidayCache.current[year]);
            } else {
                const holidayRes = await fetch(`${API_URL}/api/holidays?year=${year}`);
                const holidayData = await holidayRes.json();
                setHolidays(holidayData);
                // Update cache
                holidayCache.current[year] = holidayData;
            }

            const vacationRes = await fetch(`${API_URL}/api/vacations`);
            const vacationData = await vacationRes.json();
            setVacations(vacationData);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setApiOnline(false);
            toast.error("Fehler beim Laden der Daten");
        } finally {
            setLoading(false);
        }
    }, [year]);

    // Initial Fetch
    useEffect(() => {
        setLoading(true);
        fetchData();
        setApiOnline(true);
        document.title = `Ferienplaner ${year} - Bayern`;
    }, [fetchData, year]);

    const getDatesInRange = useCallback((s, e) => {
        const dates = [];
        const start = new Date(s);
        const end = new Date(e);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, []);

    const handleSubmitRange = useCallback(async ({ startDate: s, endDate: e, userId: rangeUserId }) => {
        const previousVacations = [...vacations];
        const range = s < e ? { s, e } : { s: e, e: s };
        const dates = getDatesInRange(range.s, range.e);

        // Optimistic update for the visible calendar
        const prevMap = new Map(previousVacations.map(v => [v.date, v.userId]));
        const optimisticMap = new Map(prevMap);
        dates.forEach(ds => optimisticMap.set(ds, rangeUserId));
        const optimisticVacations = Array.from(optimisticMap.entries()).map(([date, userId]) => ({ date, userId }));
        setVacations(optimisticVacations);

        try {
            const res = await fetch(`${API_URL}/api/vacations/range`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: range.s, endDate: range.e, userId: rangeUserId })
            });
            if (!res.ok) throw new Error('Failed to save');

            toast.success('Urlaub eingetragen', {
                action: {
                    label: 'Undo',
                    onClick: async () => {
                        setVacations(previousVacations);
                        try {
                            await Promise.all(
                                dates.map(date => {
                                    const prevUserId = prevMap.get(date);
                                    return fetch(`${API_URL}/api/vacations`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date, userId: prevUserId ?? null })
                                    });
                                })
                            );
                        } catch {
                            toast.error('Undo fehlgeschlagen');
                        }
                    }
                }
            });
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Speichern');
            setVacations(previousVacations);
        } finally {
            if (fetchData) fetchData();
        }
    }, [fetchData, getDatesInRange, vacations]);

    // Stats Calculation
    const stats = useMemo(() => {
        let p1 = 0;
        let p2 = 0;
        let care = 0;
        let p1Net = 0; // Net vacation days (no weekends/public holidays)
        let p2Net = 0;
        let totalNetHolidays = 0;
        let unattended = 0;

        // Iterate through all days of the year to calculate stats
        for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateString = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const date = new Date(year, m, d);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Check Public Holiday
                const isPublicHoliday = holidays.public.some(h => h.date === dateString);

                // Check School Holiday
                const isSchoolHoliday = holidays.school.some(h => dateString >= h.start && dateString <= h.end);

                // Check Vacation
                const vacationUserId = vacationsMap.get(dateString);
                const hasP1 = vacationUserId === 'p1' || vacationUserId === 'both';
                const hasP2 = vacationUserId === 'p2' || vacationUserId === 'both';
                const hasCare = vacationUserId === 'care';

                // Check Free Days (Recurring)
                // dayOfWeek is 0 (Sun) to 6 (Sat)
                // p1DaysOff/p2DaysOff contains these numbers
                const isP1Free = p1DaysOff.includes(dayOfWeek);
                const isP2Free = p2DaysOff.includes(dayOfWeek);

                // Count Personal Vacation Days (Total)
                if (hasP1) p1++;
                if (hasP2) p2++;
                if (hasCare) care++;

                // Count Personal Net Vacation Days (Cost for the person)
                // Assuming vacation days on weekends/public holidays don't count against allowance
                if (hasP1 && !isWeekend && !isPublicHoliday) p1Net++;
                if (hasP2 && !isWeekend && !isPublicHoliday) p2Net++;

                // Count Net Holiday Days (School holiday, no weekend, no public holiday)
                if (isSchoolHoliday && !isWeekend && !isPublicHoliday) {
                    totalNetHolidays++;

                    // Count Unattended
                    // If either parent has vacation OR care OR it's a recurring free day for either parent, it's attended
                    if (!hasP1 && !hasP2 && !hasCare && !isP1Free && !isP2Free) {
                        unattended++;
                    }
                }
            }
        }

        return { p1, p2, care, p1Net, p2Net, totalNetHolidays, unattended };
    }, [vacationsMap, holidays, year, p1DaysOff, p2DaysOff]);

    // Calculate Month Stats (Care coverage per month)
    const monthStats = useMemo(() => {
        const statsByMonth = Array(12).fill(null).map(() => ({ required: 0, covered: 0 }));

        for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateString = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const date = new Date(year, m, d);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Check Public Holiday
                const isPublicHoliday = holidays.public.some(h => h.date === dateString);

                // Check School Holiday
                const isSchoolHoliday = holidays.school.some(h => dateString >= h.start && dateString <= h.end);

                // Check Vacation/Coverage
                const vacationUserId = vacationsMap.get(dateString);
                const hasP1 = vacationUserId === 'p1' || vacationUserId === 'both';
                const hasP2 = vacationUserId === 'p2' || vacationUserId === 'both';
                const hasCare = vacationUserId === 'care';
                const isP1Free = p1DaysOff.includes(dayOfWeek);
                const isP2Free = p2DaysOff.includes(dayOfWeek);

                // We only care about School Holidays that are NOT weekends or public holidays
                if (isSchoolHoliday && !isWeekend && !isPublicHoliday) {
                    statsByMonth[m].required++;
                    
                    // Check if covered
                    if (hasP1 || hasP2 || hasCare || isP1Free || isP2Free) {
                        statsByMonth[m].covered++;
                    }
                }
            }
        }
        return statsByMonth;
    }, [vacationsMap, holidays, year, p1DaysOff, p2DaysOff]);

    // Add a saving state to track which cell is currently updating
    const [savingDate, setSavingDate] = useState(null);

    // --- Drag & Select Handlers ---
    const handleMouseDown = (dateString, e) => {
        // Prevent default text selection
        e.preventDefault();
        setIsDragging(true);
        setStartDate(dateString);
        setEndDate(dateString);
    };

    const handleMouseEnter = (dateString, e, status) => {
        if (isDragging) {
            setEndDate(dateString);
        }
        
        // Only show tooltip if the day has content (Holiday, Vacation, Care, Free Day)
        // Skip tooltips for plain weekends or empty workdays
        const hasContent = 
            status.publicHoliday || 
            (status.schoolHoliday && !status.isWeekend) || 
            status.p1 || 
            status.p2 || 
            status.care ||
            status.isP1Free ||
            status.isP2Free;

        if (hasContent) {
            const rect = e.target.getBoundingClientRect();
            setTooltipPos({ 
                x: rect.left + window.scrollX + rect.width / 2, 
                y: rect.top + window.scrollY - 10 
            });
            setHoveredDay(status);
        } else {
            setHoveredDay(null);
        }
    };

    // Attach global mouse up listener to handle dragging release outside of cells
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Normalize range so start is always before end
                if (startDate > endDate) {
                    const temp = startDate;
                    setStartDate(endDate);
                    setEndDate(temp);
                }
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, startDate, endDate]);

    // Tooltip State
    const [hoveredDay, setHoveredDay] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleMouseLeaveCell = () => {
        setHoveredDay(null);
    };

    const handleCellClick = async (dateString) => {
        if (isDragging && startDate !== endDate) return;

        if (savingDate) return; 
        setSavingDate(dateString);

        // Find if there is already a vacation on this day
        const existingUserId = vacationsMap.get(dateString);
        let newUserId = null;

        if (!existingUserId) {
            newUserId = userId; // Use currently selected user from dropdown
        } else if (existingUserId === userId) {
             // Cycle logic if clicking same user type
             if (userId === 'p1') newUserId = 'p2';
             else if (userId === 'p2') newUserId = 'both';
             else if (userId === 'both') newUserId = 'care';
             else if (userId === 'care') newUserId = 'p1';
             else newUserId = null; 
        } else {
             // If clicking different user type, switch to that or mix?
             // Simplification: Cycle through main types
             if (existingUserId === 'p1') newUserId = 'p2';
             else if (existingUserId === 'p2') newUserId = 'both';
             else if (existingUserId === 'both') newUserId = 'care';
             else if (existingUserId === 'care') newUserId = null;
             else newUserId = null;
        }
        
        // Optimistic update
        const previousVacations = [...vacations];
        let newVacationsList;
        if (newUserId) {
            newVacationsList = vacations.filter(v => v.date !== dateString);
            newVacationsList.push({ date: dateString, userId: newUserId });
        } else {
            newVacationsList = vacations.filter(v => v.date !== dateString);
        }
        setVacations(newVacationsList);

        try {
            await fetch(`${API_URL}/api/vacations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateString, userId: newUserId })
            });
        } catch (err) {
            console.error("Failed to save vacation", err);
            toast.error("Speichern fehlgeschlagen!");
            setVacations(previousVacations); 
        } finally {
            setSavingDate(null);
        }
    };

    const getDayStatus = (monthIndex, day) => {
        const date = new Date(year, monthIndex, day);
        if (date.getMonth() !== monthIndex) return 'invalid';

        // Adjust for timezone issues by working with strings
        const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check Public Holiday
        const publicHoliday = holidays.public.find(h => h.date === dateString);

        // Check School Holiday
        const schoolHoliday = holidays.school.find(h => {
            return dateString >= h.start && dateString <= h.end;
        });

        // Check Vacations (Optimized Map Lookup)
        const vacationUserId = vacationsMap.get(dateString);
        const p1 = vacationUserId === 'p1' || vacationUserId === 'both';
        const p2 = vacationUserId === 'p2' || vacationUserId === 'both';
        const care = vacationUserId === 'care';

        // Check Free Days
        const isP1Free = p1DaysOff.includes(dayOfWeek);
        const isP2Free = p2DaysOff.includes(dayOfWeek);

        // Check Selection Range
        let isSelected = false;
        if (startDate && endDate) {
            // Simple string comparison works for ISO dates
            const s = startDate < endDate ? startDate : endDate;
            const e = startDate < endDate ? endDate : startDate;
            isSelected = dateString >= s && dateString <= e;
        }

        return {
            date,
            dateString,
            isWeekend,
            publicHoliday: publicHoliday?.name,
            schoolHoliday: !!schoolHoliday,
            p1,
            p2,
            care,
            isP1Free,
            isP2Free,
            isSelected
        };
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="flex flex-col select-none relative">
            {/* Custom Tooltip */}
            {hoveredDay && (
                <div 
                    className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs rounded-lg shadow-xl backdrop-blur border border-white/10"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="font-bold mb-1 border-b border-white/20 pb-1">{new Date(hoveredDay.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="space-y-1">
                        {hoveredDay.publicHoliday && <div className="text-red-300 dark:text-red-600 font-bold">🎉 {hoveredDay.publicHoliday}</div>}
                        {hoveredDay.schoolHoliday && <div className="text-amber-300 dark:text-amber-600">🏫 Schulferien</div>}
                        
                        {hoveredDay.p1 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: p1Color}}></div> Papa hat Urlaub</div>}
                        {hoveredDay.p2 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: p2Color}}></div> Mama hat Urlaub</div>}
                        
                        {hoveredDay.isP1Free && !hoveredDay.p1 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-current" style={{color: p1Color}}></div> Papa frei (Teilzeit)</div>}
                        {hoveredDay.isP2Free && !hoveredDay.p2 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-current" style={{color: p2Color}}></div> Mama frei (Teilzeit)</div>}

                        {hoveredDay.care && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: careColor}}></div> Betreuung (Oma/Opa)</div>}
                        
                        {!hoveredDay.p1 && !hoveredDay.p2 && !hoveredDay.care && !hoveredDay.isP1Free && !hoveredDay.isP2Free && !hoveredDay.schoolHoliday && !hoveredDay.publicHoliday && !hoveredDay.isWeekend && <div className="opacity-70">Arbeitstag</div>}
                        
                        {!hoveredDay.p1 && !hoveredDay.p2 && !hoveredDay.care && !hoveredDay.isP1Free && !hoveredDay.isP2Free && hoveredDay.schoolHoliday && !hoveredDay.isWeekend && !hoveredDay.publicHoliday && <div className="text-red-400 font-bold animate-pulse">⚠️ Unbetreut!</div>}
                    </div>
                </div>
            )}

            {/* Compact Toolbar */}
            <CalendarToolbar 
                year={year}
                setYear={setYear}
                stats={stats}
                p1Color={p1Color}
                p2Color={p2Color}
                careColor={careColor}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                userId={userId}
                setUserId={setUserId}
                onUpdate={fetchData}
                onSubmitRange={handleSubmitRange}
                apiOnline={apiOnline}
            />

            {/* Print Header (Visible only in print) */}
            <div className="hidden print-header mb-4 items-center justify-between border-b-2 border-slate-800 pb-2">
                <h1 className="text-2xl font-bold text-slate-900">Ferienplaner {year}</h1>
                <div className="text-sm text-slate-500">Stand: {new Date().toLocaleDateString('de-DE')}</div>
            </div>

            {/* Legend */}
            <CalendarLegend 
                p1Color={p1Color} 
                p2Color={p2Color} 
                careColor={careColor}
                setP1Color={setP1Color} 
                setP2Color={setP2Color} 
                setCareColor={setCareColor}
            />

            {/* Scrollable Calendar Container */}
            <div className="calendar-container flex-1 overflow-auto relative rounded-xl border border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 shadow-2xl transition-colors">
                <div className="calendar-min-width-wrapper min-w-[800px] sm:min-w-[1000px]"> {/* Reduced min-width */}

                    {/* Sticky Header Row */}
                    <div className="calendar-grid grid grid-cols-[40px_repeat(12,1fr)] gap-px sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-md transition-colors h-auto min-h-[40px] items-stretch">
                        <div className="calendar-corner-header font-bold text-center text-gray-500 dark:text-gray-400 flex items-end justify-center pb-1 text-[10px] bg-white dark:bg-slate-900">Tag</div>
                        {MONTHS.map((m, i) => {
                            const stats = monthStats[i];
                            const isFullyCovered = stats.covered >= stats.required;
                            
                            return (
                                <div key={m} className="calendar-header-cell font-bold text-center text-primary uppercase tracking-wider text-[10px] py-1 bg-white/95 dark:bg-slate-900 backdrop-blur transition-colors flex flex-col justify-center items-center h-full">
                                    <span>{m.substring(0, 3)}</span>
                                    {stats.required > 0 && (
                                        <span className={`text-[9px] font-bold leading-tight ${isFullyCovered ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                            {stats.covered}/{stats.required}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Days Rows */}
                    {DAYS.map(day => (
                        <div key={day} className="calendar-row grid grid-cols-[40px_repeat(12,1fr)] gap-px mb-px group/row hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            {/* Sticky Day Column */}
                            <div className="calendar-day-column sticky left-0 z-10 bg-white/95 dark:bg-slate-900 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center font-mono border-r border-gray-200 dark:border-slate-800 transition-colors">
                                {day}
                            </div>

                            {MONTHS.map((_, monthIndex) => {
                                const status = getDayStatus(monthIndex, day);

                                return (
                                    <DayCell 
                                        key={monthIndex}
                                        status={status}
                                        savingDate={savingDate}
                                        p1Color={p1Color}
                                        p2Color={p2Color}
                                        careColor={careColor}
                                        onMouseDown={handleMouseDown}
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeaveCell}
                                        onClick={handleCellClick}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print-footer">
                <span>{typeof window !== 'undefined' ? window.location.href : ''}</span>
                <span>Druckdatum: {new Date().toLocaleString('de-DE')}</span>
            </div>
        </div>
    );
};

export default CalendarView;
