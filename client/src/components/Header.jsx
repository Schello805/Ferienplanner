export const Header = ({ darkMode, setDarkMode, stateName, currentUser, currentCalendar, shareMode }) => {
    return (
        <header className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/92 px-3 py-2 shadow-sm shadow-slate-200/60 transition-colors dark:border-slate-700 dark:bg-slate-950/92 dark:shadow-black/20">
            <div className="flex min-w-0 items-center gap-3">
                <a
                    href="https://mein-ferienplaner.de/"
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1 shadow-lg shadow-slate-200/80 ring-1 ring-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:ring-slate-800 dark:hover:bg-slate-800"
                    title="mein-ferienplaner.de öffnen"
                >
                    <img src="/app-icon.png" alt="Mein Ferienplaner Logo" className="h-9 w-9 rounded-lg object-contain" />
                </a>

                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Mein Ferienplaner</h1>
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
            </div>

            <div className="flex shrink-0 items-center gap-2 no-print">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:inline-flex"
                    title="Drucken"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title={darkMode ? 'Licht an' : 'Licht aus'}
                >
                    {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.75 9.75 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.75 9.75 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.75 9.75 0 0 0 9.002-5.998Z" />
                        </svg>
                    )}
                </button>
            </div>
        </header>
    );
};
