import React from 'react';

export const CalendarLegend = ({ p1Color, p2Color, careColor, setP1Color, setP2Color, setCareColor, children = [] }) => {
    const editableItems = [
        { label: 'Papa', color: p1Color, onChange: setP1Color, title: 'Farbe für Papa ändern' },
        { label: 'Mama', color: p2Color, onChange: setP2Color, title: 'Farbe für Mama ändern' },
        { label: 'Betreuung', color: careColor, onChange: setCareColor, title: 'Farbe für Betreuung ändern' },
    ];

    return (
        <div className="calendar-legend space-y-3 rounded-2xl border border-slate-200 bg-white/92 p-3 text-xs text-slate-700 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
            <div className="grid grid-cols-2 gap-2">
                <div className="flex min-h-9 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="legend-marker-holiday h-3 w-3 rounded border border-amber-300 bg-amber-100 dark:border-amber-600/30 dark:bg-amber-900/40"></div>
                    <span className="font-medium">Ferien</span>
                </div>
                <div className="flex min-h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-2.5 py-2 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="legend-marker-public h-3 w-3 rounded border border-red-300 bg-red-100 dark:border-red-500/40 dark:bg-red-900/50"></div>
                    <span className="font-medium">Feiertag</span>
                </div>
                <div className="flex min-h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-2.5 py-2 dark:border-red-900/40 dark:bg-slate-950/40">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-red-100 text-xs font-black leading-none text-red-600 dark:bg-red-950 dark:text-red-400">!</span>
                    <span className="font-medium">Unbetreut</span>
                </div>
                <div className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="flex -space-x-1">
                        <div className="h-3 w-3 rounded-full ring-1 ring-white dark:ring-slate-950" style={{ backgroundColor: p1Color }}></div>
                        <div className="h-3 w-3 rounded-full ring-1 ring-white dark:ring-slate-950" style={{ backgroundColor: p2Color }}></div>
                    </div>
                    <span className="font-medium">Beide</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {editableItems.map((item) => (
                    <label
                        key={item.label}
                        className="group relative flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                    >
                        <span className="h-3.5 w-3.5 rounded-full shadow-sm ring-2 ring-white transition-all group-hover:ring-slate-300 dark:ring-slate-950 dark:group-hover:ring-slate-500" style={{ backgroundColor: item.color }}></span>
                        <span className="font-semibold">{item.label}</span>
                        <input
                            type="color"
                            value={item.color}
                            onChange={(e) => item.onChange(e.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            title={item.title}
                        />
                    </label>
                ))}
            </div>

            {Array.isArray(children) && children.length > 0 && (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-3">
                    {children.map((child) => (
                        <div key={child.id ?? child.name} className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/40">
                            <div
                                className="h-3.5 w-3.5 rounded-full shadow-sm"
                                style={{ backgroundColor: child.color || '#f59e0b' }}
                                title={child.name}
                            ></div>
                            <span className="truncate font-semibold">{child.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
