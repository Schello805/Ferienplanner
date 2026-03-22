import React from 'react';
import { CalendarLegend } from './CalendarLegend';
import { GERMAN_STATES } from '../constants/germanStates';

const formatGermanDate = (value) => {
    if (!value) return value;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    const [, year, month, day] = match;
    return `${day}.${month}.${year}`;
};

const INFO_TEXT = {
    calendarDays: 'Kal. = Kalendertage inklusive Wochenenden und Feiertagen.',
    netDays: 'Netto = Tage ohne Wochenenden und gesetzliche Feiertage.',
};

const RECURRENCE_OPTIONS = [
    { value: 'weekly', label: 'Wöchentlich' },
    { value: 'biweekly', label: '14-tägig' },
    { value: 'monthly', label: 'Monatlich' },
];

const RECURRENCE_HINTS = {
    weekly: 'Jeder gewählte Wochentag gilt jede Woche.',
    biweekly: 'Die gewählten Wochentage gelten jede zweite Woche ab dem Referenzdatum.',
    monthly: 'Die gewählten Wochentage gelten monatlich in derselben Wochenlage wie das Referenzdatum.',
};

const WEEKDAYS = [
    { label: 'Mo', value: 1 },
    { label: 'Di', value: 2 },
    { label: 'Mi', value: 3 },
    { label: 'Do', value: 4 },
    { label: 'Fr', value: 5 },
    { label: 'Sa', value: 6 },
    { label: 'So', value: 0 },
];

const TABS = [
    {
        id: 'legend',
        label: 'Legende',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15m-15 5.25h15m-15 5.25h15" />
            </svg>
        )
    },
    {
        id: 'settings',
        label: 'Einstellungen',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        )
    },
    {
        id: 'help',
        label: 'Hilfe',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 17.25h.008v.008H12v-.008Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        )
    },
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
                        settings-day-btn h-8 w-8 rounded-lg text-xs font-bold transition-all
                        ${isSelected
                            ? 'text-white shadow-sm scale-105'
                            : 'settings-day-btn-inactive bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
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

const RecurringRuleEditor = ({ label, color, selectedDays, onChangeDays, rule, onChangeRule }) => (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="settings-label text-sm font-bold text-slate-700 dark:text-gray-200">{label}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Rhythmus</span>
                <select
                    value={rule.frequency}
                    onChange={(e) => onChangeRule({ ...rule, frequency: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                    {RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>

            {rule.frequency !== 'weekly' && (
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>Referenzdatum</span>
                    <input
                        type="date"
                        value={rule.anchorDate}
                        onChange={(e) => onChangeRule({ ...rule, anchorDate: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </label>
            )}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {RECURRENCE_HINTS[rule.frequency]}
        </div>

        <DaySelector selectedDays={selectedDays} onChange={onChangeDays} color={color} />
    </div>
);

const SidebarSection = ({ title, subtitle, children }) => (
    <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white/82 p-4 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900/78 dark:shadow-black/10">
        <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
    </section>
);

const InfoHint = ({ text }) => (
    <span
        title={text}
        aria-label={text}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:text-slate-300"
    >
        i
    </span>
);

const SettingsPanel = ({
    stateCode,
    setStateCode,
    totalNetHolidays,
    holidayBreakdown,
    p1Color,
    setP1Color,
    p2Color,
    setP2Color,
    careColor,
    setCareColor,
    p1DaysOff,
    setP1DaysOff,
    p1RecurringRule,
    setP1RecurringRule,
    p2DaysOff,
    setP2DaysOff,
    p2RecurringRule,
    setP2RecurringRule
}) => {
    const totals = holidayBreakdown.reduce((acc, holiday) => {
        acc.calendarDays += holiday.calendarDays;
        acc.netDays += holiday.netDays;
        return acc;
    }, { calendarDays: 0, netDays: 0 });

    return (
    <div className="space-y-4">
        <SidebarSection title="Bundesland" subtitle="Feiertage und Schulferien werden für dieses Bundesland geladen.">
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-medium">Auswahl</span>
                <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                    {GERMAN_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                            {state.name}
                        </option>
                    ))}
                </select>
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="font-semibold">Ferientage</div>
                <div className="text-xs opacity-80">Netto-Schulferientage im gewählten Jahr</div>
                <div className="mt-1 text-lg font-bold">{totalNetHolidays}</div>
            </div>
            {holidayBreakdown.length > 0 && (
                <details className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/80">
                        <span>Ferientabelle anzeigen</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">eingeklappt</span>
                    </summary>
                    <div className="border-t border-slate-200 dark:border-slate-700">
                        <div className="max-h-80 overflow-y-auto">
                            <table className="w-full table-fixed text-xs">
                                <colgroup>
                                    <col />
                                    <col className="w-[64px]" />
                                    <col className="w-[82px]" />
                                </colgroup>
                                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-semibold">Ferien</th>
                                        <th className="px-2 py-2 text-right font-semibold" title={INFO_TEXT.calendarDays}>
                                            <span className="inline-flex items-center justify-end">
                                                Kal.
                                                <InfoHint text={INFO_TEXT.calendarDays} />
                                            </span>
                                        </th>
                                        <th className="px-2 py-2 text-right font-semibold" title={INFO_TEXT.netDays}>
                                            <span className="inline-flex items-center justify-end">
                                                Netto
                                                <InfoHint text={INFO_TEXT.netDays} />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                    {holidayBreakdown.map((holiday) => (
                                        <tr key={`${holiday.name}-${holiday.start}-${holiday.end}`}>
                                            <td className="px-2 py-2 align-top">
                                                <div className="font-medium text-slate-800 dark:text-slate-100">{holiday.name}</div>
                                                <div className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                                                    {formatGermanDate(holiday.start)} bis {formatGermanDate(holiday.end)}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-right font-medium text-slate-700 dark:text-slate-200" title={INFO_TEXT.calendarDays}>{holiday.calendarDays}</td>
                                            <td className="px-2 py-2 text-right font-medium text-slate-900 dark:text-white" title={INFO_TEXT.netDays}>{holiday.netDays}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 dark:bg-slate-950/80">
                                    <tr>
                                        <td className="px-2 py-2 font-semibold text-slate-800 dark:text-slate-100">Summe</td>
                                        <td className="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-200" title={INFO_TEXT.calendarDays}>{totals.calendarDays}</td>
                                        <td className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white" title={INFO_TEXT.netDays}>{totals.netDays}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span title={INFO_TEXT.calendarDays}>
                                Kal.
                                <InfoHint text={INFO_TEXT.calendarDays} />
                            </span>
                            {' = Kalendertage, '}
                            <span title={INFO_TEXT.netDays}>
                                Netto
                                <InfoHint text={INFO_TEXT.netDays} />
                            </span>
                            {' = ohne Wochenenden und gesetzliche Feiertage'}
                        </div>
                    </div>
                </details>
            )}
        </SidebarSection>

        <SidebarSection title="Farben" subtitle="Direkt anpassen, ohne den Kalender zu verlassen.">
            <div className="space-y-3">
                {[
                    { label: 'Papa', color: p1Color, setColor: setP1Color },
                    { label: 'Mama', color: p2Color, setColor: setP2Color },
                    { label: 'Betreuung', color: careColor, setColor: setCareColor },
                ].map(item => (
                    <div key={item.label} className="settings-row flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                            <span className="settings-label font-medium text-slate-700 dark:text-gray-200">{item.label}</span>
                        </div>
                        <input
                            type="color"
                            value={item.color}
                            onChange={(e) => item.setColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                    </div>
                ))}
            </div>
        </SidebarSection>

        <SidebarSection title="Regelmäßige freie Tage" subtitle="Diese Tage gelten als betreut, verbrauchen aber keinen Urlaub. Rhythmus und Referenzdatum steuern die Wiederholung.">
            <div className="space-y-5">
                <RecurringRuleEditor
                    label="Papa"
                    color={p1Color}
                    selectedDays={p1DaysOff}
                    onChangeDays={setP1DaysOff}
                    rule={p1RecurringRule}
                    onChangeRule={setP1RecurringRule}
                />
                <RecurringRuleEditor
                    label="Mama"
                    color={p2Color}
                    selectedDays={p2DaysOff}
                    onChangeDays={setP2DaysOff}
                    rule={p2RecurringRule}
                    onChangeRule={setP2RecurringRule}
                />
            </div>
        </SidebarSection>

        <div className="settings-info-box rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            Die Einstellungen werden automatisch gespeichert.
        </div>
    </div>
    );
};

const HelpPanel = () => (
    <div className="space-y-4 text-sm text-slate-600 dark:text-gray-300">
        <SidebarSection title="Bedienung" subtitle="So trägst du Urlaub oder Betreuung schnell ein.">
            <div className="grid gap-3">
                {[
                    ['1x Klick', 'Papa hat Urlaub', 'bg-green-500', 'P'],
                    ['2x Klick', 'Mama hat Urlaub', 'bg-blue-500', 'M'],
                    ['3x Klick', 'Beide haben Urlaub', 'bg-gradient-to-br from-green-500 to-blue-500', 'B'],
                    ['4x Klick', 'Betreuung durch Oma, Opa oder Hort', 'bg-fuchsia-500', 'O'],
                    ['5x Klick', 'Eintrag löschen', 'border border-gray-300 dark:border-slate-600', 'X'],
                ].map(([title, text, tone, letter]) => (
                    <div key={title} className="help-info-box flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/65">
                        <div className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white ${tone}`}>
                            {letter}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 dark:text-white">{title}</div>
                            <div className="text-xs">{text}</div>
                        </div>
                    </div>
                ))}
            </div>
        </SidebarSection>

        <SidebarSection title="Praktisch" subtitle="Die wichtigsten Funktionen auf einen Blick.">
            <div className="space-y-3">
                <div className="help-feature-blue rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="font-bold text-blue-800 dark:text-blue-300">Drucken</div>
                    <p className="text-xs">Das Drucksymbol erstellt eine A4-Querformat-Ansicht des gesamten Kalenders.</p>
                </div>
                <div className="help-feature-purple rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-900/20">
                    <div className="font-bold text-fuchsia-800 dark:text-fuchsia-300">Teilzeit und freie Tage</div>
                    <p className="text-xs">Hinterlegte freie Tage decken Betreuungslücken ab, ohne Urlaubstage zu verbrauchen.</p>
                </div>
                <div className="help-feature-amber rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="font-bold text-amber-800 dark:text-amber-300">Feiertage und Ferien</div>
                    <p className="text-xs">Gesetzliche Feiertage und Schulferien werden für das gewählte Bundesland geladen und bei Bedarf aus Cache oder Fallback geliefert.</p>
                </div>
            </div>
        </SidebarSection>
    </div>
);

export const UtilitySidebar = ({
    isOpen,
    activeTab,
    setActiveTab,
    setIsOpen,
    onClose,
    p1Color,
    p2Color,
    careColor,
    stateCode,
    setStateCode,
    totalNetHolidays,
    holidayBreakdown,
    setP1Color,
    setP2Color,
    setCareColor,
    p1DaysOff,
    setP1DaysOff,
    p1RecurringRule,
    setP1RecurringRule,
    p2DaysOff,
    setP2DaysOff,
    p2RecurringRule,
    setP2RecurringRule,
}) => {
    const activeLabel = TABS.find(tab => tab.id === activeTab)?.label ?? 'Werkzeuge';

    const renderContent = () => {
        switch (activeTab) {
            case 'legend':
                return (
                    <SidebarSection title="Legende" subtitle="Farben, Bedeutungen und Schnellzugriff auf Farbwahl.">
                        <CalendarLegend
                            p1Color={p1Color}
                            p2Color={p2Color}
                            careColor={careColor}
                            setP1Color={setP1Color}
                            setP2Color={setP2Color}
                            setCareColor={setCareColor}
                        />
                    </SidebarSection>
                );
            case 'settings':
                return (
                    <SettingsPanel
                        stateCode={stateCode}
                        setStateCode={setStateCode}
                        totalNetHolidays={totalNetHolidays}
                        holidayBreakdown={holidayBreakdown}
                        p1Color={p1Color}
                        setP1Color={setP1Color}
                        p2Color={p2Color}
                        setP2Color={setP2Color}
                        careColor={careColor}
                        setCareColor={setCareColor}
                        p1DaysOff={p1DaysOff}
                        setP1DaysOff={setP1DaysOff}
                        p1RecurringRule={p1RecurringRule}
                        setP1RecurringRule={setP1RecurringRule}
                        p2DaysOff={p2DaysOff}
                        setP2DaysOff={setP2DaysOff}
                        p2RecurringRule={p2RecurringRule}
                        setP2RecurringRule={setP2RecurringRule}
                    />
                );
            case 'help':
            default:
                return <HelpPanel />;
        }
    };

    return (
        <>
            <div
                className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
            />

            <aside
                className={`
                    utility-sidebar fixed inset-y-0 right-0 z-50 flex w-[min(94vw,520px)] flex-col border-l border-slate-200 bg-white/96 shadow-2xl shadow-slate-300/40 transition-transform dark:border-slate-700 dark:bg-slate-950/96 dark:shadow-black/30
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    lg:static lg:z-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-xl
                    ${isOpen ? 'lg:w-[480px]' : 'lg:w-[64px]'}
                `}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                    <div className={`overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:hidden'}`}>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Utility Sidebar</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">{activeLabel}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        title={isOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
                    >
                        {isOpen ? '→' : '←'}
                    </button>
                </div>

                <div className="flex min-h-0 flex-1">
                    <nav className="flex w-16 flex-col items-center gap-2 border-r border-slate-200 bg-slate-50/70 px-2 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                        {TABS.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsOpen(true);
                                    }}
                                    className={`flex w-full items-center justify-center rounded-xl px-2 py-2 transition-colors ${active ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                                    title={tab.label}
                                    aria-label={tab.label}
                                >
                                    {tab.icon}
                                </button>
                            );
                        })}
                    </nav>

                    <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${isOpen ? 'block' : 'hidden lg:hidden'}`}>
                        {renderContent()}
                    </div>
                </div>
            </aside>
        </>
    );
};
