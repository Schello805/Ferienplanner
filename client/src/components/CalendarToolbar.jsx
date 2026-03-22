import React from 'react';
import { VacationRangeInput } from './VacationRangeInput';

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
    setShowPlanner
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
        <div className="calendar-toolbar mb-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/88 p-2 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-950/88 dark:shadow-black/20">
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
                    <button
                        type="button"
                        onClick={() => setShowPlanner(!showPlanner)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${showPlanner ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                    >
                        {showPlanner ? 'Urlaub eintragen schließen' : 'Urlaub eintragen'}
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {summaryItems.map(item => (
                        <div key={`${item.label}-${item.value}`} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${item.tone}`}>
                            {item.marker}
                            <span className="font-semibold">{item.label}</span>
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {showPlanner && (
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
