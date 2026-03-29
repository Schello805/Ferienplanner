import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { CalendarToolbar } from './CalendarToolbar';
import { DayCell } from './DayCell';
import { authFetch } from '../lib/api';

const MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const parseDateOnly = (value) => {
    const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const isValid =
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day);

    return isValid ? date : null;
};

const formatDateOnly = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatGermanDateLabel = (date) =>
    new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);

const formatDateWithWeekday = (value) => {
    const parsed = parseDateOnly(value);
    if (!parsed) return value;
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(parsed);
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = parsed.getUTCFullYear();
    return `${day}.${month}.${year} (${weekday})`;
};

const mobileActionProps = (handler) => ({
    onPointerUp: (event) => {
        event.preventDefault();
        handler();
    },
    style: { touchAction: 'manipulation' },
});

const parseLocalDateInput = (value) => {
    const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const isValid =
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day);

    return isValid ? date : null;
};

const startOfWeek = (date) => {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const getWeekdayOccurrenceInMonth = (date) => Math.floor((date.getDate() - 1) / 7) + 1;

const isRecurringDayMatch = (date, selectedDays = [], rule = { frequency: 'weekly' }) => {
    if (!selectedDays.includes(date.getDay())) return false;

    const frequency = rule?.frequency || 'weekly';
    if (frequency === 'weekly') return true;

    const anchorDate = parseLocalDateInput(rule?.anchorDate);
    if (!anchorDate) return true;
    if (date < anchorDate) return false;

    if (frequency === 'biweekly') {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekDiff = Math.round((startOfWeek(date) - startOfWeek(anchorDate)) / msPerWeek);
        return weekDiff % 2 === 0;
    }

    if (frequency === 'monthly') {
        return getWeekdayOccurrenceInMonth(date) === getWeekdayOccurrenceInMonth(anchorDate);
    }

    return true;
};

const getMatchingRecurringRules = (date, rules = []) =>
    rules.filter((rule) => isRecurringDayMatch(date, rule?.days || [], rule));

const getRecurringRuleLabel = (rule = { frequency: 'weekly' }) => {
    if (rule.frequency === 'biweekly') return '14-tägig';
    if (rule.frequency === 'monthly') return 'monatlich';
    return 'wöchentlich';
};

const getRecurringRuleDetails = (rule = {}) => {
    const weekdayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const selectedDays = (rule.days || [])
        .map((day) => weekdayLabels[day])
        .join(', ');
    const mode = getRecurringRuleLabel(rule);

    if (!selectedDays) return mode;
    if (rule.frequency === 'weekly') return `${mode}: ${selectedDays}`;
    return `${mode}: ${selectedDays} ab ${rule.anchorDate}`;
};

const formatHolidayName = (value) => {
    if (!value) return 'Ferien';

    const normalized = value.trim().toLowerCase();
    const knownNames = {
        herbstferien: 'Herbstferien',
        osterferien: 'Osterferien',
        pfingstferien: 'Pfingstferien',
        pfingsttage: 'Pfingsttage',
        sommerferien: 'Sommerferien',
        weihnachtsferien: 'Weihnachtsferien',
        winterferien: 'Winterferien',
    };

    if (knownNames[normalized]) {
        return knownNames[normalized];
    }

    return normalized
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const buildNotice = (meta) => {
    if (!meta) return null;

    if (meta.source === 'cache') {
        return {
            tone: 'info',
            title: 'Ferien erfolgreich geladen',
            message: 'Die Feriendaten kommen aus dem Zwischenspeicher. Das beschleunigt die Anzeige und vermeidet unnötige API-Aufrufe.',
        };
    }

    if (meta.source === 'stale-cache') {
        return {
            tone: 'warning',
            title: 'Zwischengespeicherte Feriendaten aktiv',
            message: meta.message || 'Die Live-Quelle war gerade nicht erreichbar. Es werden zuletzt erfolgreich geladene Feriendaten verwendet.',
        };
    }

    if (meta.source === 'static-fallback') {
        return {
            tone: 'warning',
            title: 'Lokale Ersatzdaten aktiv',
            message: meta.message || 'Die Live-Quelle war gerade nicht erreichbar. Es werden hinterlegte Feriendaten verwendet.',
        };
    }

    if (meta.source === 'error') {
        return {
            tone: 'error',
            title: 'Ferien konnten nicht geladen werden',
            message: meta.message || 'Aktuell sind weder Live-Daten noch lokale Ersatzdaten verfügbar.',
        };
    }

    if (meta.warning) {
        return {
            tone: 'info',
            title: 'Hinweis',
            message: meta.warning,
        };
    }

    return null;
};

const CalendarView = ({ 
    year,
    setYear,
    p1Color, 
    p2Color, 
    careColor, 
    stateCode,
    stateName,
    isMobile,
    shareMode,
    readOnly,
    children = [],
    childFreeDays = [],
    p1RecurringRules = [],
    p2RecurringRules = [],
    onApiStatusChange,
    onStatsChange,
    onHolidayBreakdownChange,
    onVacationsChange,
    onCopyShareLink,
    onExitShareMode
}) => {
    const [holidays, setHolidays] = useState({ public: [], school: [], meta: null });
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(true);
    const [apiNotice, setApiNotice] = useState(null);
    
    // Cache for holiday data to avoid redundant API calls
    const holidayCache = React.useRef({});

    // Range Input State (Lifted)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [userId, setUserId] = useState('p1');
    const [isDragging, setIsDragging] = useState(false);
    const [showPlanner, setShowPlanner] = useState(false);
    const [mobileMonth, setMobileMonth] = useState(new Date().getMonth());
    const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
    const [mobileGapInfoOpen, setMobileGapInfoOpen] = useState(false);
    const [pendingMobileScrollDate, setPendingMobileScrollDate] = useState(null);
    const mobileDayRefs = useRef({});

    // Optimize vacation lookup using Map (O(1))
    const vacationsMap = useMemo(() => {
        const map = new Map();
        vacations.forEach(v => map.set(v.date, v.userId));
        return map;
    }, [vacations]);

    const childrenById = useMemo(
        () => new Map(children.map((child) => [Number(child.id), child])),
        [children]
    );

    const childFreeDaysByDate = useMemo(() => {
        const map = new Map();
        childFreeDays.forEach((entry) => {
            const child = childrenById.get(Number(entry.childId));
            if (!child) return;
            const start = parseDateOnly(entry.startDate);
            const end = parseDateOnly(entry.endDate);
            if (!start || !end) return;

            for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
                const dateString = formatDateOnly(day);
                if (!map.has(dateString)) {
                    map.set(dateString, []);
                }
                map.get(dateString).push({
                    childId: child.id,
                    childName: child.name,
                    childColor: child.color,
                    label: entry.label || 'Individueller freier Tag',
                });
            }
        });
        return map;
    }, [childFreeDays, childrenById]);

    const getChildrenNeedingCare = useCallback((dateString, isSchoolHoliday) => {
        if (children.length === 0) {
            return [];
        }

        const activeChildren = new Map();

        if (isSchoolHoliday) {
            children.forEach((child) => {
                if (!child.usesSchoolHolidays) return;
                activeChildren.set(child.id, {
                    childId: child.id,
                    childName: child.name,
                    childColor: child.color,
                    reasons: ['Schulferien'],
                });
            });
        }

        (childFreeDaysByDate.get(dateString) || []).forEach((entry) => {
            const existing = activeChildren.get(entry.childId);
            if (existing) {
                if (!existing.reasons.includes(entry.label)) {
                    existing.reasons.push(entry.label);
                }
                return;
            }
            activeChildren.set(entry.childId, {
                childId: entry.childId,
                childName: entry.childName,
                childColor: entry.childColor,
                reasons: [entry.label],
            });
        });

        return Array.from(activeChildren.values());
    }, [childFreeDaysByDate, children]);

    // Fetch Data Function
    const fetchData = useCallback(async () => {
        // Don't set loading true here to avoid flickering on updates
        // setLoading(true); 
        try {
            setApiOnline(true);
            // Check cache first
            const cacheKey = `${year}-${stateCode}`;
            if (holidayCache.current[cacheKey]) {
                const cachedHolidayData = holidayCache.current[cacheKey];
                setHolidays(cachedHolidayData);
                setApiNotice(buildNotice(cachedHolidayData.meta));
            } else {
                const holidayRes = await authFetch(`/api/holidays?year=${year}&state=${stateCode}`);
                if (!holidayRes.ok) throw new Error(`holidays request failed: ${holidayRes.status}`);
                const holidayData = await holidayRes.json();
                setHolidays(holidayData);
                setApiNotice(buildNotice(holidayData.meta));
                // Update cache
                holidayCache.current[cacheKey] = holidayData;
            }

            const vacationRes = await authFetch('/api/vacations');
            if (!vacationRes.ok) throw new Error(`vacations request failed: ${vacationRes.status}`);
            const vacationData = await vacationRes.json();
            setVacations(vacationData);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setApiOnline(false);
            setApiNotice({
                tone: 'error',
                title: 'Keine API-Daten erhalten',
                message: 'Die Webapp konnte keine Daten vom Server laden. Bitte Seite neu laden oder Server-Verbindung prüfen.',
            });
            toast.error("Fehler beim Laden der Daten");
        } finally {
            setLoading(false);
        }
    }, [stateCode, year]);

    // Initial Fetch
    useEffect(() => {
        setLoading(true);
        fetchData();
        document.title = `Mein Ferienplaner ${year} - ${stateName}`;
    }, [fetchData, stateName, year]);

    useEffect(() => {
        const now = new Date();
        if (year === now.getFullYear()) {
            setMobileMonth(now.getMonth());
        } else {
            setMobileMonth(0);
        }
    }, [year]);

    const getDatesInRange = useCallback((s, e) => {
        const start = parseDateOnly(s);
        const end = parseDateOnly(e);
        if (!start || !end) return [];

        const dates = [];
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            dates.push(formatDateOnly(d));
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
            const res = await authFetch('/api/vacations/range', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: range.s, endDate: range.e, userId: rangeUserId })
            });
            if (!res.ok) throw new Error(`Failed to save: ${res.status}`);

            toast.success('Urlaub eingetragen', {
                action: {
                    label: 'Undo',
                    onClick: async () => {
                        setVacations(previousVacations);
                        try {
                            const responses = await Promise.all(
                                dates.map(date => {
                                    const prevUserId = prevMap.get(date);
                                    return authFetch('/api/vacations', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date, userId: prevUserId ?? null })
                                    });
                                })
                            );
                            const firstError = responses.find(r => !r.ok);
                            if (firstError) throw new Error(`Undo failed: ${firstError.status}`);
                        } catch {
                            toast.error('Undo fehlgeschlagen');
                        }
                    }
                }
            });
        } catch (err) {
            console.error(err);
            setApiNotice({
                tone: 'error',
                title: 'Speichern fehlgeschlagen',
                message: 'Der markierte Bereich konnte nicht gespeichert werden. Die lokale Änderung wurde zurückgesetzt.',
            });
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
        const unattendedDates = [];

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
                const isP1Free = getMatchingRecurringRules(date, p1RecurringRules).length > 0;
                const isP2Free = getMatchingRecurringRules(date, p2RecurringRules).length > 0;

                // Count Personal Vacation Days (Total)
                if (hasP1) p1++;
                if (hasP2) p2++;
                if (hasCare) care++;

                // Count Personal Net Vacation Days (Cost for the person)
                // Assuming vacation days on weekends/public holidays don't count against allowance
                if (hasP1 && !isWeekend && !isPublicHoliday) p1Net++;
                if (hasP2 && !isWeekend && !isPublicHoliday) p2Net++;

                const childrenNeedingCare = getChildrenNeedingCare(dateString, isSchoolHoliday);
                const requiresCare = children.length === 0 ? isSchoolHoliday : childrenNeedingCare.length > 0;

                // Count Net Holiday Days (School holiday, no weekend, no public holiday)
                if (isSchoolHoliday && !isWeekend && !isPublicHoliday) {
                    totalNetHolidays++;
                }

                if (requiresCare && !isWeekend && !isPublicHoliday) {
                    if (!hasP1 && !hasP2 && !hasCare && !isP1Free && !isP2Free) {
                        unattended++;
                        unattendedDates.push(dateString);
                    }
                }
            }
        }

        return { p1, p2, care, p1Net, p2Net, totalNetHolidays, unattended, unattendedDates };
    }, [children.length, getChildrenNeedingCare, vacationsMap, holidays, year, p1RecurringRules, p2RecurringRules]);

    useEffect(() => {
        if (onStatsChange) {
            onStatsChange(stats);
        }
    }, [onStatsChange, stats]);

    useEffect(() => {
        if (onApiStatusChange) {
            onApiStatusChange(apiOnline);
        }
    }, [apiOnline, onApiStatusChange]);

    const holidayBreakdown = useMemo(() => {
        return holidays.school.map((holiday) => {
            const start = parseDateOnly(holiday.start);
            const end = parseDateOnly(holiday.end);
            if (!start || !end) {
                return {
                    name: formatHolidayName(holiday.name),
                    start: holiday.start,
                    end: holiday.end,
                    calendarDays: 0,
                    netDays: 0,
                };
            }

            let calendarDays = 0;
            let netDays = 0;
            for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                calendarDays++;
                const dateString = formatDateOnly(d);
                const localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
                const dayOfWeek = localDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isPublicHoliday = holidays.public.some((item) => item.date === dateString);
                if (!isWeekend && !isPublicHoliday) {
                    netDays++;
                }
            }

            return {
                name: formatHolidayName(holiday.name),
                start: holiday.start,
                end: holiday.end,
                calendarDays,
                netDays,
            };
        });
    }, [holidays.public, holidays.school]);

    useEffect(() => {
        if (onHolidayBreakdownChange) {
            onHolidayBreakdownChange(holidayBreakdown);
        }
    }, [holidayBreakdown, onHolidayBreakdownChange]);

    useEffect(() => {
        if (onVacationsChange) {
            onVacationsChange(vacations);
        }
    }, [onVacationsChange, vacations]);

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
                const isP1Free = getMatchingRecurringRules(date, p1RecurringRules).length > 0;
                const isP2Free = getMatchingRecurringRules(date, p2RecurringRules).length > 0;

                const childrenNeedingCare = getChildrenNeedingCare(dateString, isSchoolHoliday);
                const requiresCare = children.length === 0 ? isSchoolHoliday : childrenNeedingCare.length > 0;

                if (requiresCare && !isWeekend && !isPublicHoliday) {
                    statsByMonth[m].required++;
                    
                    // Check if covered
                    if (hasP1 || hasP2 || hasCare || isP1Free || isP2Free) {
                        statsByMonth[m].covered++;
                    }
                }
            }
        }
        return statsByMonth;
    }, [children.length, getChildrenNeedingCare, vacationsMap, holidays, year, p1RecurringRules, p2RecurringRules]);

    // Add a saving state to track which cell is currently updating
    const [savingDate, setSavingDate] = useState(null);

    // --- Drag & Select Handlers ---
    const handleMouseDown = (dateString, e) => {
        if (readOnly) return;
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
        if (readOnly) return;
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
            const res = await authFetch('/api/vacations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateString, userId: newUserId })
            });
            if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
        } catch (err) {
            console.error("Failed to save vacation", err);
            setApiOnline(false);
            setApiNotice({
                tone: 'error',
                title: 'Speichern fehlgeschlagen',
                message: 'Der ausgewählte Tag konnte nicht gespeichert werden. Bitte Server-Verbindung prüfen.',
            });
            toast.error("Speichern fehlgeschlagen!");
            setVacations(previousVacations); 
        } finally {
            setSavingDate(null);
        }
    };

    const getDayStatus = useCallback((monthIndex, day) => {
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
        const matchingP1Rules = getMatchingRecurringRules(date, p1RecurringRules);
        const matchingP2Rules = getMatchingRecurringRules(date, p2RecurringRules);
        const isP1Free = matchingP1Rules.length > 0;
        const isP2Free = matchingP2Rules.length > 0;
        const childrenNeedingCare = getChildrenNeedingCare(dateString, !!schoolHoliday);
        const requiresCare = children.length === 0 ? !!schoolHoliday : childrenNeedingCare.length > 0;

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
            p1RecurringLabels: matchingP1Rules.map(getRecurringRuleDetails),
            p2RecurringLabels: matchingP2Rules.map(getRecurringRuleDetails),
            childrenNeedingCare,
            requiresCare,
            isSelected
        };
    }, [children.length, getChildrenNeedingCare, year, holidays.public, holidays.school, vacationsMap, p1RecurringRules, p2RecurringRules, startDate, endDate]);

    const mobileDays = useMemo(() => {
        const daysInMonth = new Date(year, mobileMonth + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, index) => getDayStatus(mobileMonth, index + 1));
    }, [year, mobileMonth, getDayStatus]);

    const jumpToToday = () => {
        const now = new Date();
        const target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        setYear(now.getFullYear());
        setMobileMonth(now.getMonth());
        setPendingMobileScrollDate(target);
    };

    const jumpToNextHoliday = () => {
        const today = new Date();
        const nowString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const nextHoliday = holidays.school.find((holiday) => holiday.end >= nowString) || holidays.school[0];
        if (!nextHoliday) return;
        const date = parseDateOnly(nextHoliday.start);
        if (!date) return;
        setYear(date.getUTCFullYear());
        setMobileMonth(date.getUTCMonth());
        setPendingMobileScrollDate(nextHoliday.start);
    };

    const jumpToFirstGap = () => {
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const status = getDayStatus(monthIndex, day);
                const unattended = status.requiresCare && !status.isWeekend && !status.publicHoliday && !status.p1 && !status.p2 && !status.care && !status.isP1Free && !status.isP2Free;
                if (unattended) {
                    setMobileMonth(monthIndex);
                    setPendingMobileScrollDate(status.dateString);
                    return;
                }
            }
        }
    };

    useEffect(() => {
        if (!pendingMobileScrollDate) return;
        const target = mobileDayRefs.current[pendingMobileScrollDate];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setPendingMobileScrollDate(null);
        }
    }, [mobileDays, pendingMobileScrollDate]);

    if (loading) return (
        <div className="flex items-center justify-center h-screen text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (isMobile) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/88">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            {...mobileActionProps(() => setMobileMonth((prev) => (prev === 0 ? 11 : prev - 1)))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
                        >
                            ←
                        </button>
                        <div className="text-center">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{MONTHS[mobileMonth]} {year}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{stateName}</div>
                        </div>
                        <button
                            type="button"
                            {...mobileActionProps(() => setMobileMonth((prev) => (prev === 11 ? 0 : prev + 1)))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
                        >
                            →
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" {...mobileActionProps(jumpToToday)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Heute</button>
                        <button type="button" {...mobileActionProps(jumpToNextHoliday)} className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">Nächste Ferien</button>
                        <button type="button" {...mobileActionProps(jumpToFirstGap)} className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">Lücken</button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white/88 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/88">
                    <button
                        type="button"
                        onClick={() => setMobileStatsOpen((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left"
                    >
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Kennzahlen</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {mobileStatsOpen ? 'eingeblendet' : 'eingeklappt'}
                            </div>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">{mobileStatsOpen ? '−' : '+'}</span>
                    </button>

                    {mobileStatsOpen && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                                <div className="font-semibold text-slate-700 dark:text-slate-200">Papa</div>
                                <div className="text-slate-500 dark:text-slate-400">{stats.p1Net}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                                <div className="font-semibold text-slate-700 dark:text-slate-200">Mama</div>
                                <div className="text-slate-500 dark:text-slate-400">{stats.p2Net}</div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                                <div className="font-semibold">Ferien</div>
                                <div>{stats.totalNetHolidays}</div>
                            </div>
                            <div className={`rounded-xl border px-3 py-2 text-xs ${stats.unattended > 0 ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold">{stats.unattended > 0 ? 'Lücken' : 'Status'}</div>
                                        <div>{stats.unattended > 0 ? `${stats.unattended} offen` : 'Alles betreut'}</div>
                                    </div>
                                    {stats.unattended > 0 && stats.unattended < 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setMobileGapInfoOpen((value) => !value)}
                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-[10px] font-bold opacity-80"
                                        >
                                            i
                                        </button>
                                    )}
                                </div>
                                {stats.unattended > 0 && stats.unattended < 5 && mobileGapInfoOpen && (
                                    <div className="mt-2 rounded-lg border border-red-200/70 bg-white/80 p-2 text-[11px] text-red-900 dark:border-red-900/40 dark:bg-slate-950/40 dark:text-red-100">
                                        <div className="mb-1 font-semibold">Unbetreute Tage</div>
                                        <div className="space-y-1">
                                            {stats.unattendedDates.map((date) => (
                                                <div key={date}>{formatDateWithWeekday(date)}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/88 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/88">
                    <div className="space-y-2">
                        {mobileDays.map((status) => {
                            const labels = [];
                            if (status.publicHoliday) labels.push({ text: status.publicHoliday, tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100' });
                            if (status.schoolHoliday) labels.push({ text: 'Schulferien', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100' });
                            status.childrenNeedingCare.forEach((child) => {
                                labels.push({
                                    text: child.childName,
                                    tone: 'text-white',
                                    style: { backgroundColor: child.childColor || '#f59e0b' }
                                });
                            });
                            if (status.p1) labels.push({ text: 'Papa Urlaub', tone: 'text-white', style: { backgroundColor: p1Color } });
                            if (status.p2) labels.push({ text: 'Mama Urlaub', tone: 'text-white', style: { backgroundColor: p2Color } });
                            if (status.care) labels.push({ text: 'Betreuung', tone: 'text-white', style: { backgroundColor: careColor } });
                            if (status.isP1Free && !status.p1) labels.push({ text: 'Papa frei', tone: 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100', style: { boxShadow: `inset 0 0 0 2px ${p1Color}` } });
                            if (status.isP2Free && !status.p2) labels.push({ text: 'Mama frei', tone: 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100', style: { boxShadow: `inset 0 0 0 2px ${p2Color}` } });

                            const unattended = status.requiresCare && !status.isWeekend && !status.publicHoliday && !status.p1 && !status.p2 && !status.care && !status.isP1Free && !status.isP2Free;

                            return (
                                <button
                                    key={status.dateString}
                                    type="button"
                                    onClick={() => {
                                        if (!readOnly) {
                                            handleCellClick(status.dateString);
                                        }
                                    }}
                                    ref={(element) => {
                                        if (element) {
                                            mobileDayRefs.current[status.dateString] = element;
                                        }
                                    }}
                                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${unattended ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'} ${readOnly ? 'cursor-default' : ''}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-white">{formatGermanDateLabel(status.date)}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{status.dateString}</div>
                                        </div>
                                        {unattended && <div className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white">Lücke</div>}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {labels.length > 0 ? labels.map((label, index) => (
                                            <span
                                                key={`${status.dateString}-${index}-${label.text}`}
                                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${label.tone}`}
                                                style={label.style}
                                            >
                                                {label.text}
                                            </span>
                                        )) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500">Kein Eintrag</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col select-none relative">
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
                        {hoveredDay.childrenNeedingCare?.map((child) => (
                            <div key={`child-${child.childId}`} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.childColor || '#f59e0b' }}></div>
                                {child.childName} frei ({child.reasons.join(', ')})
                            </div>
                        ))}
                        
                        {hoveredDay.p1 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: p1Color}}></div> Papa hat Urlaub</div>}
                        {hoveredDay.p2 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: p2Color}}></div> Mama hat Urlaub</div>}
                        
                        {hoveredDay.isP1Free && !hoveredDay.p1 && hoveredDay.p1RecurringLabels.map((label) => (
                            <div key={`p1-${label}`} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full border border-current" style={{color: p1Color}}></div>
                                Papa frei ({label})
                            </div>
                        ))}
                        {hoveredDay.isP2Free && !hoveredDay.p2 && hoveredDay.p2RecurringLabels.map((label) => (
                            <div key={`p2-${label}`} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full border border-current" style={{color: p2Color}}></div>
                                Mama frei ({label})
                            </div>
                        ))}

                        {hoveredDay.care && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: careColor}}></div> Betreuung (Oma/Opa)</div>}
                        
                        {!hoveredDay.p1 && !hoveredDay.p2 && !hoveredDay.care && !hoveredDay.isP1Free && !hoveredDay.isP2Free && !hoveredDay.schoolHoliday && !hoveredDay.publicHoliday && !hoveredDay.isWeekend && <div className="opacity-70">Arbeitstag</div>}
                        
                        {!hoveredDay.p1 && !hoveredDay.p2 && !hoveredDay.care && !hoveredDay.isP1Free && !hoveredDay.isP2Free && hoveredDay.requiresCare && !hoveredDay.isWeekend && !hoveredDay.publicHoliday && <div className="text-red-400 font-bold animate-pulse">⚠️ Unbetreut!</div>}
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
                showPlanner={showPlanner}
                setShowPlanner={setShowPlanner}
                readOnly={readOnly}
                shareMode={shareMode}
                onCopyShareLink={onCopyShareLink}
                onExitShareMode={onExitShareMode}
            />

            {/* Print Header (Visible only in print) */}
            <div className="print-header mb-4 hidden items-center justify-between border-b-2 border-slate-800 pb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Mein Ferienplaner {year}</h1>
                    <div className="text-sm text-slate-600">{stateName}</div>
                </div>
                <div className="text-sm text-slate-500">Stand: {new Date().toLocaleDateString('de-DE')}</div>
            </div>

            <div className="print-summary mb-3 hidden grid-cols-5 gap-2 text-[11px] text-slate-800">
                <div className="rounded border border-slate-300 px-2 py-1"><strong>Papa:</strong> {stats.p1Net}</div>
                <div className="rounded border border-slate-300 px-2 py-1"><strong>Mama:</strong> {stats.p2Net}</div>
                <div className="rounded border border-slate-300 px-2 py-1"><strong>Ferien:</strong> {stats.totalNetHolidays}</div>
                <div className="rounded border border-slate-300 px-2 py-1"><strong>Betreuung:</strong> {stats.care}</div>
                <div className="rounded border border-slate-300 px-2 py-1"><strong>Warnung:</strong> {stats.unattended}</div>
            </div>

            {/* Prominent notices */}
            {apiNotice && apiNotice.tone !== 'info' && (
                <div className={`mb-2 rounded-2xl border px-4 py-3 text-sm shadow-sm print:hidden ${
                    apiNotice.tone === 'error'
                        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
                        : apiNotice.tone === 'warning'
                            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
                            : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100'
                }`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="font-bold">{apiNotice.title}</div>
                            <div className="mt-1 text-xs sm:text-sm">{apiNotice.message}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setApiNotice(null)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold opacity-70 transition-opacity hover:opacity-100"
                        >
                            Ausblenden
                        </button>
                    </div>
                </div>
            )}

            {/* Scrollable Calendar Container */}
            <div className={`calendar-container relative flex-1 min-h-0 overflow-auto rounded-2xl border border-gray-200 bg-white/60 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 ${shareMode ? 'ring-1 ring-slate-200/70 dark:ring-slate-700/70' : ''}`}>
                <div className="calendar-min-width-wrapper min-w-[760px] sm:min-w-[920px]">

                    {/* Sticky Header Row */}
                    <div className="calendar-grid grid grid-cols-[34px_repeat(12,minmax(0,1fr))] gap-px sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-md transition-colors h-auto min-h-[34px] items-stretch">
                        <div className="calendar-corner-header font-bold text-center text-gray-500 dark:text-gray-400 flex items-end justify-center pb-1 text-[10px] bg-white dark:bg-slate-900">Tag</div>
                        {MONTHS.map((m, i) => {
                            const stats = monthStats[i];
                            const isFullyCovered = stats.covered >= stats.required;
                            
                            return (
                                <div key={m} className="calendar-header-cell flex h-full flex-col items-center justify-center bg-white/95 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 backdrop-blur transition-colors dark:bg-slate-900 dark:text-slate-100">
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
                        <div key={day} className="calendar-row grid grid-cols-[34px_repeat(12,minmax(0,1fr))] gap-px mb-px group/row hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
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

            {shareMode && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 print:hidden">
                    Diese Ansicht ist schreibgeschützt und für kompakte Weitergabe optimiert. Sie ersetzt keine Benutzerfreigabe: Änderungen bleiben nur in der normalen Arbeitsansicht mit gültigem Login möglich.
                </div>
            )}

            {/* Print Footer */}
            <div className="print-footer hidden items-center justify-between border-t border-slate-300 pt-2 text-[10px] text-slate-600">
                <div className="print-legend flex flex-wrap gap-3">
                    <span>Ferien: gelber Hintergrund</span>
                    <span>Feiertag: roter Hintergrund</span>
                    <span>Papa/Mama/Betreuung: farbige Einträge</span>
                    <span>Warnung: rote Markierung</span>
                </div>
                <span>Druckdatum: {new Date().toLocaleString('de-DE')}</span>
            </div>
        </div>
    );
};

export default CalendarView;
