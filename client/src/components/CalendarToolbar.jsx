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
    apiOnline
}) => {
    const currentYear = new Date().getFullYear();

    return (
        <div className="calendar-toolbar flex flex-wrap items-center justify-between gap-4 p-3 bg-white/50 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm mb-4">
            
            {/* Left Group: Year & Stats */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {/* Year Selector */}
                <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-0.5">
                    {[currentYear, currentYear + 1, currentYear + 2].map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${year === y ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                {typeof apiOnline === 'boolean' && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className={`inline-block w-2 h-2 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{apiOnline ? 'Online' : 'Offline'}</span>
                    </div>
                )}

                <div className="w-px h-6 bg-gray-300 dark:bg-slate-800 hidden sm:block"></div>

                {/* Stats Group */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* Papa Stats */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded border border-gray-100 dark:border-slate-800">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p1Color }}></div>
                        <span className="font-bold text-slate-700 dark:text-gray-200">Papa:</span>
                        <span className="text-gray-500 dark:text-gray-400">{stats.p1} ({stats.p1Net})</span>
                    </div>

                    {/* Mama Stats */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded border border-gray-100 dark:border-slate-800">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p2Color }}></div>
                        <span className="font-bold text-slate-700 dark:text-gray-200">Mama:</span>
                        <span className="text-gray-500 dark:text-gray-400">{stats.p2} ({stats.p2Net})</span>
                    </div>

                    {/* Care Stats */}
                    {stats.care > 0 && (
                        <div className="stat-item-care flex items-center gap-2 text-xs sm:text-sm bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/30 text-purple-800 dark:text-purple-100">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: careColor }}></div>
                            <span className="font-bold">Betreuung:</span>
                            <span>{stats.care}</span>
                        </div>
                    )}

                    {/* Netto Ferien */}
                    <div className="stat-item-holiday flex items-center gap-2 text-xs sm:text-sm bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-100">
                        <span className="font-bold">Ferien:</span>
                        <span>{stats.totalNetHolidays}</span>
                    </div>

                    {/* Unbetreut Warning */}
                    {stats.unattended > 0 ? (
                        <div className="stat-item-warning flex items-center gap-2 text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-100 font-bold animate-pulse">
                            <span>⚠️ {stats.unattended} Unbetreut</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 dark:text-green-400 opacity-60">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                            <span>Alles betreut</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Range Input (Right aligned) */}
            <div className="flex-shrink-0">
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
        </div>
    );
};
