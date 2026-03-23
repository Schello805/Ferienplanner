import React from 'react';
import { VacationRangeInput } from './VacationRangeInput';

const formatUnattendedLabel = (value) => {
    const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match) return value;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date);
    return `${day}.${month}.${year} (${weekday})`;
};

export const CalendarToolbar = ({ 
    year, 
    setYear, 
    stats, 
    p1Color, 
    p2Color,
    careColor,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    userId,
    setUserId,
    onUpdate,
    onSubmitRange,
    showPlanner,
    setShowPlanner,
    readOnly,
    shareMode,
    onCopyShareLink,
    onExitShareMode
}) => {
    const currentYear = new Date().getFullYear();
    const summaryItems = [
        {
            label: 'Papa',
            value: `${stats.p1} (${stats.p1Net})`,
            tone: 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-slate-700 dark:text-gray-200',
            marker: <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p1Color }}></div>
        },
        {
            label: 'Mama',
            value: `${stats.p2} (${stats.p2Net})`,
            tone: 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-slate-700 dark:text-gray-200',
            marker: <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p2Color }}></div>
        },
        {
            label: 'Ferien',
            value: `${stats.totalNetHolidays}`,
            tone: 'stat-item-holiday bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-100',
        }
    ];

    if (stats.care > 0) {
        summaryItems.push({
            label: 'Betreuung',
            value: `${stats.care}`,
            tone: 'stat-item-care bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-100 dark:border-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-100',
            marker: <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: careColor }}></div>
        });
    }

    summaryItems.push(
        stats.unattended > 0
            ? {
                label: 'Warnung',
                value: `${stats.unattended} unbetreut`,
                tone: 'stat-item-warning bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-100 font-bold'
            }
            : {
                label: 'Status',
                value: 'Alles betreut',
                tone: 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200'
            }
    );

    return (
        <div className="calendar-toolbar relative z-[60] mb-2 space-y-2 overflow-visible">
            <div className="relative z-[60] flex flex-wrap items-center justify-between gap-2 overflow-visible rounded-2xl border border-slate-200/80 bg-white/88 p-2 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-950/88 dark:shadow-black/20">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    {[currentYear, currentYear + 1, currentYear + 2].map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${year === y ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                        >
                            {y}
                        </button>
                    ))}
                    </div>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => setShowPlanner(!showPlanner)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${showPlanner ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                        >
                            {showPlanner ? 'Urlaub eintragen schließen' : 'Urlaub eintragen'}
                        </button>
                    )}
                    {shareMode && (
                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-100">
                            Freigabe · schreibgeschützt
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {summaryItems.map(item => {
                        const showUnattendedTooltip = item.label === 'Warnung' && stats.unattended > 0 && stats.unattended < 5;
                        return (
                            <div
                                key={`${item.label}-${item.value}`}
                                className={`relative overflow-visible flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${item.tone}`}
                            >
                                {item.marker}
                                <span className="font-semibold">{item.label}</span>
                                <span>{item.value}</span>
                                {showUnattendedTooltip && (
                                    <div className="group relative ml-1">
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current/30 text-[10px] font-bold opacity-80">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25h.008v.008H12V8.25Zm0 3v4.5m9-3.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                        </span>
                                        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-[80] w-64 rounded-xl border border-red-200 bg-white/98 p-3 text-left text-[11px] font-medium text-slate-700 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 dark:border-red-900/40 dark:bg-slate-950/98 dark:text-slate-100">
                                            <div className="mb-2 font-bold text-red-700 dark:text-red-300">Unbetreute Tage</div>
                                            <div className="space-y-1">
                                                {stats.unattendedDates.map((date) => (
                                                    <div key={date}>{formatUnattendedLabel(date)}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {shareMode && (
                        <>
                            <button
                                type="button"
                                onClick={onCopyShareLink}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                Link kopieren
                            </button>
                            <button
                                type="button"
                                onClick={onExitShareMode}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                Beenden
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showPlanner && !readOnly && (
                <div className="rounded-2xl border border-sky-100 bg-white/88 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/88">
                <VacationRangeInput 
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    userId={userId}
                    setUserId={setUserId}
                    onUpdate={onUpdate} 
                    onSubmitRange={onSubmitRange}
                    p1Color={p1Color} 
                    p2Color={p2Color} 
                    careColor={careColor}
                />
                </div>
            )}
        </div>
    );
};
