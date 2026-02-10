const WEEKDAYS = [
    { label: 'Mo', value: 1 },
    { label: 'Di', value: 2 },
    { label: 'Mi', value: 3 },
    { label: 'Do', value: 4 },
    { label: 'Fr', value: 5 },
    { label: 'Sa', value: 6 },
    { label: 'So', value: 0 },
];

const DaySelector = ({ selectedDays, onChange, color }) => (
    <div className="flex gap-1">
        {WEEKDAYS.map(day => {
            const isSelected = selectedDays.includes(day.value);
            return (
                <button
                    key={day.value}
                    onClick={() => {
                        if (isSelected) {
                            onChange(selectedDays.filter(d => d !== day.value));
                        } else {
                            onChange([...selectedDays, day.value]);
                        }
                    }}
                    className={`
                            settings-day-btn w-8 h-8 rounded-lg text-xs font-bold transition-all
                            ${isSelected 
                                ? 'text-white shadow-sm scale-105' 
                                : 'settings-day-btn-inactive bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }
                        `}
                    style={isSelected ? { backgroundColor: color } : {}}
                    type="button"
                >
                    {day.label}
                </button>
            );
        })}
    </div>
);

export const SettingsModal = ({ 
    isOpen, 
    onClose, 
    p1Color, 
    setP1Color, 
    p2Color, 
    setP2Color, 
    careColor, 
    setCareColor,
    p1DaysOff, 
    setP1DaysOff, 
    p2DaysOff, 
    setP2DaysOff 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="settings-modal-content bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="settings-modal-header p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="settings-modal-heading text-xl font-bold">Einstellungen</h2>
                    <button onClick={onClose} className="settings-close-button text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Colors Section */}
                    <div>
                        <h3 className="settings-section-title text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Farben anpassen</h3>

                        <div className="space-y-4">
                            <div className="settings-row flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: p1Color }}></div>
                                    <span className="settings-label font-medium text-slate-700 dark:text-gray-200">Papa</span>
                                </div>
                                <input
                                    type="color"
                                    value={p1Color}
                                    onChange={(e) => setP1Color(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                                />
                            </div>

                            <div className="settings-row flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: p2Color }}></div>
                                    <span className="settings-label font-medium text-slate-700 dark:text-gray-200">Mama</span>
                                </div>
                                <input
                                    type="color"
                                    value={p2Color}
                                    onChange={(e) => setP2Color(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                                />
                            </div>

                            <div className="settings-row flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: careColor }}></div>
                                    <span className="settings-label font-medium text-slate-700 dark:text-gray-200">Betreuung</span>
                                </div>
                                <input
                                    type="color"
                                    value={careColor}
                                    onChange={(e) => setCareColor(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Free Days Section */}
                    <div>
                        <h3 className="settings-section-title text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Regelmäßige freie Tage</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            Wähle Tage (z.B. für Teilzeit), die automatisch als "betreut" gelten, aber keine Urlaubstage verbrauchen.
                        </p>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p1Color }}></div>
                                    <span className="settings-label text-sm font-bold text-slate-700 dark:text-gray-200">Papa</span>
                                </div>
                                <DaySelector 
                                    selectedDays={p1DaysOff} 
                                    onChange={setP1DaysOff} 
                                    color={p1Color} 
                                />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p2Color }}></div>
                                    <span className="settings-label text-sm font-bold text-slate-700 dark:text-gray-200">Mama</span>
                                </div>
                                <DaySelector 
                                    selectedDays={p2DaysOff} 
                                    onChange={setP2DaysOff} 
                                    color={p2Color} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="settings-info-box bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200">
                        <p>Die Einstellungen werden automatisch gespeichert.</p>
                    </div>
                </div>

                <div className="settings-footer p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="settings-done-button px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Fertig
                    </button>
                </div>
            </div>
        </div>
    );
};
