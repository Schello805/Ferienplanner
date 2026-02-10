export const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="help-modal-content bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
                <div className="help-modal-header p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h2 className="help-modal-title text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-primary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                        Hilfe & Anleitung
                    </h2>
                    <button onClick={onClose} className="help-close-button text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="help-text-content p-6 overflow-y-auto space-y-8 text-slate-600 dark:text-gray-300">

                    <section>
                        <h3 className="help-section-title text-lg font-bold text-slate-800 dark:text-white mb-3">Wie plane ich Urlaub?</h3>
                        <p className="mb-4">
                            Klicke einfach auf einen Tag im Kalender, um den Status zu ändern. Jeder Klick schaltet durch die folgenden Optionen:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="help-info-box flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white font-bold text-xs">P</div>
                                <div>
                                    <span className="font-bold block text-slate-800 dark:text-white">1x Klick: Papa</span>
                                    <span className="text-xs">Papa hat Urlaub</span>
                                </div>
                            </div>
                            <div className="help-info-box flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-xs">M</div>
                                <div>
                                    <span className="font-bold block text-slate-800 dark:text-white">2x Klick: Mama</span>
                                    <span className="text-xs">Mama hat Urlaub</span>
                                </div>
                            </div>
                            <div className="help-info-box flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">B</div>
                                <div>
                                    <span className="font-bold block text-slate-800 dark:text-white">3x Klick: Beide</span>
                                    <span className="text-xs">Gemeinsamer Urlaub</span>
                                </div>
                            </div>
                            <div className="help-info-box flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                <div className="w-8 h-8 rounded bg-purple-500 flex items-center justify-center text-white font-bold text-xs">O</div>
                                <div>
                                    <span className="font-bold block text-slate-800 dark:text-white">4x Klick: Betreuung</span>
                                    <span className="text-xs">Oma, Opa, Hort etc.</span>
                                </div>
                            </div>
                            <div className="help-info-box flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                <div className="w-8 h-8 rounded border border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-400 text-xs">X</div>
                                <div>
                                    <span className="font-bold block text-slate-800 dark:text-white">5x Klick: Löschen</span>
                                    <span className="text-xs">Kein Eintrag</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="help-section-title text-lg font-bold text-slate-800 dark:text-white mb-3">Neue Funktionen</h3>
                        <div className="space-y-4">
                            <div className="help-feature-blue bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                    </svg>
                                    Drucken
                                </h4>
                                <p className="text-sm text-blue-800/80 dark:text-blue-300/80">
                                    Über das Drucker-Symbol oben rechts kannst du den Kalender ausdrucken. Die Ansicht wird automatisch für <strong>A4 Querformat</strong> optimiert.
                                </p>
                            </div>

                            <div className="help-feature-purple bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    Teilzeit / Freie Tage
                                </h4>
                                <p className="text-sm text-purple-800/80 dark:text-purple-300/80">
                                    In den <strong>Einstellungen</strong> kannst du feste freie Tage (z.B. jeden Mittwoch) hinterlegen. Diese gelten automatisch als "betreut", verbrauchen aber keinen Urlaub.
                                </p>
                            </div>

                            <div className="help-feature-amber bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                    </svg>
                                    Automatische Feiertage
                                </h4>
                                <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                                    Feiertage und Schulferien (Bayern) werden jetzt automatisch für jedes Jahr aktuell geladen.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="help-section-title text-lg font-bold text-slate-800 dark:text-white mb-3">Legende & Symbole</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <div className="help-legend-icon-school w-6 h-6 mt-0.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600/30 rounded flex-shrink-0"></div>
                                <div>
                                    <span className="help-legend-text font-bold text-slate-800 dark:text-white">Schulferien</span>
                                    <p className="text-sm">Tage, an denen keine Schule ist (Bayern).</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="help-legend-icon-public w-6 h-6 mt-0.5 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/40 rounded flex-shrink-0"></div>
                                <div>
                                    <span className="help-legend-text font-bold text-slate-800 dark:text-white">Feiertage</span>
                                    <p className="text-sm">Gesetzliche Feiertage in Bayern.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="help-legend-icon-alarm w-6 h-6 mt-0.5 flex items-center justify-center text-red-600 dark:text-red-500 font-black border border-red-200 dark:border-red-900 rounded bg-red-50 dark:bg-red-900/20 flex-shrink-0">!</div>
                                <div>
                                    <span className="help-legend-text font-bold text-slate-800 dark:text-white">Betreuungs-Alarm</span>
                                    <p className="text-sm">Achtung! Hier sind Schulferien, aber weder Papa noch Mama haben Urlaub eingetragen. (Wochenenden & Feiertage ausgenommen)</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                </div>

                <div className="help-modal-footer p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="help-done-button px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Verstanden
                    </button>
                </div>
            </div>
        </div>
    );
};
