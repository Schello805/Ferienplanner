import React from 'react';

export const CalendarLegend = ({ p1Color, p2Color, careColor, setP1Color, setP2Color, setCareColor }) => {
    return (
        <div className="calendar-legend mb-4 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl border border-gray-200 dark:border-slate-800 shadow-lg flex flex-wrap gap-4 justify-center text-xs sm:text-sm text-gray-700 dark:text-gray-200 sticky top-0 z-30 transition-colors">
            <div className="flex items-center gap-2">
                <div className="legend-marker-holiday w-3 h-3 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600/30 rounded"></div>
                <span>Ferien</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="legend-marker-public w-3 h-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/40 rounded"></div>
                <span>Feiertag</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-500 font-black">!</span>
                <span>Unbetreut</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>

            <div className="flex items-center gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 py-1 rounded transition-colors">
                <div className="w-3 h-3 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-gray-300 dark:group-hover:ring-gray-500 transition-all" style={{ backgroundColor: p1Color }}></div>
                <span className="font-medium">Papa</span>
                <input
                    type="color"
                    value={p1Color}
                    onChange={(e) => setP1Color(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Farbe für Papa ändern"
                />
            </div>

            <div className="flex items-center gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 py-1 rounded transition-colors">
                <div className="w-3 h-3 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-gray-300 dark:group-hover:ring-gray-500 transition-all" style={{ backgroundColor: p2Color }}></div>
                <span className="font-medium">Mama</span>
                <input
                    type="color"
                    value={p2Color}
                    onChange={(e) => setP2Color(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Farbe für Mama ändern"
                />
            </div>
            
            <div className="flex items-center gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 py-1 rounded transition-colors">
                <div className="w-3 h-3 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-gray-300 dark:group-hover:ring-gray-500 transition-all" style={{ backgroundColor: careColor }}></div>
                <span className="font-medium">Betreuung</span>
                <input
                    type="color"
                    value={careColor}
                    onChange={(e) => setCareColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Farbe für Betreuung ändern"
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p1Color }}></div>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p2Color }}></div>
                </div>
                <span>Beide</span>
            </div>
        </div>
    );
};
