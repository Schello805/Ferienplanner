export const Header = ({ stateName, currentUser, currentCalendar, shareMode }) => {
    return (
        <header className="mb-2 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/92 px-3 py-2 shadow-sm shadow-slate-200/60 transition-colors dark:border-slate-700 dark:bg-slate-950/92 dark:shadow-black/20">
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1 shadow-lg shadow-slate-200/80 ring-1 ring-white dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:ring-slate-800">
                <img src="/app-icon.png" alt="Ferienplaner Logo" className="h-9 w-9 rounded-lg object-contain" />
            </div>

            <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Ferienplaner</h1>
                <div className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {shareMode ? 'Kompakte Ansichtsfreigabe' : 'Jahresübersicht'}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    <span className="truncate">{stateName}</span>
                    {currentCalendar?.name && <span className="truncate opacity-80">· {currentCalendar.name}</span>}
                    {currentUser?.username && <span className="truncate opacity-70">· {currentUser.username}</span>}
                    {shareMode && <span className="opacity-70">· Read-only</span>}
                </div>
            </div>
        </header>
    );
};
