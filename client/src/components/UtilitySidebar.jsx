import React from 'react';
import { toast } from 'sonner';
import { CalendarLegend } from './CalendarLegend';
import { GERMAN_STATES } from '../constants/germanStates';
import { authFetch } from '../lib/api';

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

const RECURRENCE_LABELS = {
    weekly: 'jede Woche',
    biweekly: 'alle 2 Wochen',
    monthly: 'monatlich',
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

const CHILD_TYPE_OPTIONS = [
    { value: 'school', label: 'Schule' },
    { value: 'kita', label: 'Kita' },
    { value: 'other', label: 'Sonstiges' },
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
        id: 'general',
        label: 'Allgemein',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2.25" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        )
    },
    {
        id: 'parents',
        label: 'Eltern',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75a17.93 17.93 0 0 1-7.5-1.632Z" />
            </svg>
        )
    },
    {
        id: 'children',
        label: 'Kinder',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm10.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3.75 20.25a6.75 6.75 0 0 1 10.5-5.622m1.654 5.31a8.966 8.966 0 0 0 4.846 1.312c.173 0 .344-.005.514-.015a8.966 8.966 0 0 0-2.827-6.145 8.966 8.966 0 0 0-6.255-2.59c-.76 0-1.499.094-2.205.271" />
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

const createRuleId = () => `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyRule = () => ({
    id: createRuleId(),
    days: [],
    frequency: 'weekly',
    anchorDate: new Date().toISOString().slice(0, 10),
});

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

const formatRecurringSummary = (selectedDays, rule) => {
    if (!selectedDays.length) return 'Noch kein Wochentag ausgewählt.';

    const dayLabels = WEEKDAYS
        .filter((day) => selectedDays.includes(day.value))
        .map((day) => day.label)
        .join(', ');

    const frequencyLabel = RECURRENCE_LABELS[rule?.frequency] || RECURRENCE_LABELS.weekly;
    if (rule?.frequency === 'weekly') {
        return `Gilt ${frequencyLabel}: ${dayLabels}`;
    }

    const anchorDate = rule?.anchorDate ? formatGermanDate(rule.anchorDate) : 'dem Referenzdatum';
    return `Gilt ${frequencyLabel} ab ${anchorDate}: ${dayLabels}`;
};

const RecurringRuleEditor = ({ label, color, rule, onChangeRule, onRemoveRule, canRemove }) => (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="settings-label text-sm font-bold text-slate-700 dark:text-gray-200">{label}</span>
            </div>
            {canRemove && (
                <button
                    type="button"
                    onClick={onRemoveRule}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                    Entfernen
                </button>
            )}
        </div>

        <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Rhythmus</span>
                <select
                    value={rule.frequency}
                    onChange={(e) => onChangeRule({ ...rule, frequency: e.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </label>
            )}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {RECURRENCE_HINTS[rule.frequency]}
        </div>

        <DaySelector
            selectedDays={rule.days}
            onChange={(days) => onChangeRule({ ...rule, days })}
            color={color}
        />
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
            {formatRecurringSummary(rule.days, rule)}
        </div>
    </div>
);

const RecurringRulesGroup = ({ label, color, rules, setRules }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="settings-label text-sm font-bold text-slate-700 dark:text-gray-200">{label}</span>
            </div>
            <button
                type="button"
                onClick={() => setRules([...rules, createEmptyRule()])}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
                Regel hinzufügen
            </button>
        </div>

        <div className="space-y-3">
            {rules.map((rule) => (
                <RecurringRuleEditor
                    key={rule.id}
                    label={label}
                    color={color}
                    rule={rule}
                    onChangeRule={(nextRule) => setRules(rules.map((item) => item.id === rule.id ? nextRule : item))}
                    onRemoveRule={() => setRules(rules.length > 1 ? rules.filter((item) => item.id !== rule.id) : [createEmptyRule()])}
                    canRemove={rules.length > 1}
                />
            ))}
        </div>
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

const ChildManager = ({ children, onRefreshFamilyData }) => {
    const [draft, setDraft] = React.useState({
        name: '',
        type: 'school',
        color: '#f59e0b',
        usesSchoolHolidays: true,
    });

    const saveChild = async () => {
        if (!draft.name.trim()) {
            toast.error('Bitte einen Kindernamen angeben');
            return;
        }

        try {
            const response = await authFetch('/api/children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });
            if (!response.ok) throw new Error(`save child failed: ${response.status}`);
            setDraft({
                name: '',
                type: 'school',
                color: '#f59e0b',
                usesSchoolHolidays: true,
            });
            await onRefreshFamilyData();
            toast.success('Kind gespeichert');
        } catch (error) {
            console.error(error);
            toast.error('Kind konnte nicht gespeichert werden');
        }
    };

    const toggleSchoolHolidays = async (child) => {
        try {
            const response = await authFetch('/api/children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...child,
                    usesSchoolHolidays: !child.usesSchoolHolidays,
                }),
            });
            if (!response.ok) throw new Error(`update child failed: ${response.status}`);
            await onRefreshFamilyData();
        } catch (error) {
            console.error(error);
            toast.error('Kind konnte nicht aktualisiert werden');
        }
    };

    const deleteChild = async (childId) => {
        try {
            const response = await authFetch(`/api/children/${childId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`delete child failed: ${response.status}`);
            await onRefreshFamilyData();
            toast.success('Kind entfernt');
        } catch (error) {
            console.error(error);
            toast.error('Kind konnte nicht entfernt werden');
        }
    };

    return (
        <div className="space-y-3">
            <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                    <input
                        type="text"
                        value={draft.name}
                        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Name des Kindes"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <select
                        value={draft.type}
                        onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                        {CHILD_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span>Farbe</span>
                        <input
                            type="color"
                            value={draft.color}
                            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                            className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={draft.usesSchoolHolidays}
                            onChange={(event) => setDraft((current) => ({ ...current, usesSchoolHolidays: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        Landesweite Schulferien übernehmen
                    </label>
                </div>
                <button
                    type="button"
                    onClick={saveChild}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                    Kind anlegen
                </button>
            </div>

            <div className="space-y-2">
                {children.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Noch keine Kinder angelegt. Solange das leer ist, arbeitet der Kalender weiter mit dem bisherigen Familienmodell.
                    </div>
                ) : children.map((child) => (
                    <div key={child.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: child.color || '#f59e0b' }} />
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{child.name}</div>
                                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {CHILD_TYPE_OPTIONS.find((option) => option.value === child.type)?.label || 'Schule'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleSchoolHolidays(child)}
                                className={`mt-2 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                                    child.usesSchoolHolidays
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                {child.usesSchoolHolidays ? 'Landesferien aktiv' : 'Nur individuelle freie Tage'}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => deleteChild(child.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            Entfernen
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ChildFreeDayManager = ({ children, childFreeDays, onRefreshFamilyData }) => {
    const [draft, setDraft] = React.useState(() => ({
        childId: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        label: '',
    }));

    const saveFreeDay = async () => {
        if (!draft.childId) {
            toast.error('Bitte ein Kind auswählen');
            return;
        }

        try {
            const response = await authFetch('/api/child-free-days', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    childId: Number(draft.childId),
                    startDate: draft.startDate,
                    endDate: draft.endDate,
                    label: draft.label,
                }),
            });
            if (!response.ok) throw new Error(`save child-free-day failed: ${response.status}`);
            setDraft((current) => ({ ...current, label: '' }));
            await onRefreshFamilyData();
            toast.success('Freier Tag gespeichert');
        } catch (error) {
            console.error(error);
            toast.error('Freier Tag konnte nicht gespeichert werden');
        }
    };

    const deleteFreeDay = async (entryId) => {
        try {
            const response = await authFetch(`/api/child-free-days/${entryId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`delete child-free-day failed: ${response.status}`);
            await onRefreshFamilyData();
            toast.success('Freier Tag entfernt');
        } catch (error) {
            console.error(error);
            toast.error('Freier Tag konnte nicht entfernt werden');
        }
    };

    const entriesByChildName = childFreeDays.map((entry) => ({
        ...entry,
        childName: children.find((child) => child.id === entry.childId)?.name || 'Unbekannt',
        childColor: children.find((child) => child.id === entry.childId)?.color || '#f59e0b',
    }));

    return (
        <div className="space-y-3">
            <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="grid gap-2 sm:grid-cols-[1.1fr_1fr_1fr]">
                    <select
                        value={draft.childId}
                        onChange={(event) => setDraft((current) => ({ ...current, childId: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                        <option value="">Kind wählen</option>
                        {children.map((child) => (
                            <option key={child.id} value={child.id}>{child.name}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={draft.startDate}
                        onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                        type="date"
                        value={draft.endDate}
                        onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </div>
                <input
                    type="text"
                    value={draft.label}
                    onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Bezeichnung, z.B. Studientag oder Kita zu"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                    type="button"
                    onClick={saveFreeDay}
                    disabled={children.length === 0}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                    Einzelnen freien Tag anlegen
                </button>
            </div>

            <div className="space-y-2">
                {entriesByChildName.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Noch keine individuellen freien Tage angelegt.
                    </div>
                ) : entriesByChildName.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.childColor }} />
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{entry.childName}</div>
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {formatGermanDate(entry.startDate)} bis {formatGermanDate(entry.endDate)}
                            </div>
                            {entry.label && (
                                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{entry.label}</div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => deleteFreeDay(entry.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            Löschen
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoHint = ({ text }) => (
    <span className="group/tooltip relative ml-1 inline-flex">
        <span
            aria-label={text}
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 transition-colors group-hover/tooltip:border-sky-400 group-hover/tooltip:text-sky-600 dark:border-slate-600 dark:text-slate-300 dark:group-hover/tooltip:border-sky-500 dark:group-hover/tooltip:text-sky-300"
        >
            i
        </span>
        <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-48 -translate-x-1/2 rounded-lg bg-slate-950 px-2 py-1.5 text-[11px] font-medium leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 dark:bg-slate-100 dark:text-slate-900">
            {text}
        </span>
    </span>
);

const PasswordPanel = () => {
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!currentPassword || !newPassword) {
            toast.error('Bitte aktuelles und neues Passwort angeben');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Die neuen Passwörter stimmen nicht überein');
            return;
        }

        try {
            const response = await authFetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Passwort konnte nicht geändert werden');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Passwort geändert');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Passwort konnte nicht geändert werden');
        }
    };

    return (
        <SidebarSection title="Passwort" subtitle="Eigenes Passwort direkt in der App ändern.">
            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Aktuelles Passwort"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Neues Passwort"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Neues Passwort wiederholen"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                    type="submit"
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                    Passwort ändern
                </button>
            </form>
        </SidebarSection>
    );
};

const UserManagementPanel = ({ currentUser }) => {
    const [users, setUsers] = React.useState([]);
    const [draft, setDraft] = React.useState({ username: '', password: '', isAdmin: false });

    const loadUsers = React.useCallback(async () => {
        if (!currentUser?.isAdmin) return;
        try {
            const response = await authFetch('/api/users');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Benutzer konnten nicht geladen werden');
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Benutzer konnten nicht geladen werden');
        }
    }, [currentUser]);

    React.useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    if (!currentUser?.isAdmin) {
        return null;
    }

    const handleCreateUser = async (event) => {
        event.preventDefault();
        if (!draft.username.trim() || !draft.password) {
            toast.error('Bitte Benutzername und Passwort angeben');
            return;
        }
        try {
            const response = await authFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: draft.username.trim(),
                    password: draft.password,
                    isAdmin: draft.isAdmin,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Benutzer konnte nicht angelegt werden');
            setDraft({ username: '', password: '', isAdmin: false });
            await loadUsers();
            toast.success('Benutzer angelegt');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Benutzer konnte nicht angelegt werden');
        }
    };

    return (
        <SidebarSection title="Benutzer" subtitle="Weitere Konten anlegen. Admins dürfen neue Benutzer erstellen.">
            <form onSubmit={handleCreateUser} className="space-y-3">
                <input
                    type="text"
                    value={draft.username}
                    onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                    placeholder="Neuer Benutzername"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                    type="password"
                    value={draft.password}
                    onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Startpasswort"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={draft.isAdmin}
                        onChange={(event) => setDraft((current) => ({ ...current, isAdmin: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Als Admin anlegen
                </label>
                <button
                    type="submit"
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                    Benutzer anlegen
                </button>
            </form>

            <div className="space-y-2 pt-1">
                {users.map((user) => (
                    <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {user.isAdmin ? 'Admin' : 'Benutzer'}
                        </div>
                    </div>
                ))}
            </div>
        </SidebarSection>
    );
};

const GeneralSettingsPanel = ({
    stateCode,
    setStateCode,
    currentUser,
    currentCalendar,
    apiOnline,
    holidayTableOpen,
    setHolidayTableOpen,
    totalNetHolidays,
    holidayBreakdown,
    children,
    onCopyShareLink,
    onEnterShareMode,
}) => {
    const totals = holidayBreakdown.reduce((acc, holiday) => {
        acc.calendarDays += holiday.calendarDays;
        acc.netDays += holiday.netDays;
        return acc;
    }, { calendarDays: 0, netDays: 0 });

    return (
    <div className="space-y-4">
        <SidebarSection title="Kalenderkontext" subtitle="Wer arbeitet gerade in welchem Kalender?">
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-3 py-3 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100">
                <div className="font-semibold">{currentCalendar?.name || 'Mein Kalender'}</div>
                <div className="mt-1 text-xs opacity-80">
                    Angemeldet als <strong>{currentUser?.username || 'Unbekannt'}</strong>. Kinder, freie Tage, Urlaube und Regeln werden in diesem Kalender gespeichert.
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <div className="font-semibold">Kinder</div>
                    <div className="mt-1 opacity-80">{children.length > 0 ? `${children.length} angelegt` : 'Noch keine Kinder angelegt'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <div className="font-semibold">Nächster Schritt</div>
                    <div className="mt-1 opacity-80">{children.length > 0 ? 'Elternregeln und freie Tage prüfen' : 'Optional Kinder und freie Tage ergänzen'}</div>
                </div>
            </div>
        </SidebarSection>

        <SidebarSection title="Allgemeine Einstellungen" subtitle="Bundesland, API-Status und kompakte Freigabeansicht.">
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-medium">Bundesland</span>
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
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                apiOnline
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100'
                    : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100'
            }`}>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                    <div className="font-semibold">API-Status: {apiOnline ? 'Online' : 'Offline'}</div>
                    <div className="text-xs opacity-80">Bezieht sich auf die Server-Verbindung der Webapp.</div>
                </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="font-semibold">Ferientage</div>
                <div className="text-xs opacity-80">Netto-Schulferientage im gewählten Jahr</div>
                <div className="mt-1 text-lg font-bold">{totalNetHolidays}</div>
            </div>
            {holidayBreakdown.length > 0 && (
                <details
                    open={holidayTableOpen}
                    onToggle={(event) => setHolidayTableOpen(event.currentTarget.open)}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/80">
                        <span>Ferientabelle anzeigen</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {holidayTableOpen ? 'geöffnet' : 'eingeklappt'}
                        </span>
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
                                        <th className="px-2 py-2 text-right font-semibold">
                                            <span className="inline-flex items-center justify-end">
                                                Kal.
                                                <InfoHint text={INFO_TEXT.calendarDays} />
                                            </span>
                                        </th>
                                        <th className="px-2 py-2 text-right font-semibold">
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
                                            <td className="px-2 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{holiday.calendarDays}</td>
                                            <td className="px-2 py-2 text-right font-medium text-slate-900 dark:text-white">{holiday.netDays}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 dark:bg-slate-950/80">
                                    <tr>
                                        <td className="px-2 py-2 font-semibold text-slate-800 dark:text-slate-100">Summe</td>
                                        <td className="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">{totals.calendarDays}</td>
                                        <td className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">{totals.netDays}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span className="inline-flex items-center">
                                Kal.
                                <InfoHint text={INFO_TEXT.calendarDays} />
                            </span>
                            {' = Kalendertage, '}
                            <span className="inline-flex items-center">
                                Netto
                                <InfoHint text={INFO_TEXT.netDays} />
                            </span>
                            {' = ohne Wochenenden und gesetzliche Feiertage'}
                        </div>
                    </div>
                </details>
            )}
        </SidebarSection>

        <SidebarSection title="Ansichtslink" subtitle="Erzeuge eine reduzierte, schreibgeschützte Ansicht für dein aktuelles Konto.">
            <div className="grid gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onEnterShareMode}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                    Ansichtsmodus öffnen
                </button>
                <button
                    type="button"
                    onClick={onCopyShareLink}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                    Ansichtslink kopieren
                </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                Der Link wechselt nur in eine kompakte, schreibgeschützte Ansicht. Externe Empfänger benötigen weiterhin ein gültiges Benutzerkonto für diese Installation.
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                Für echtes gemeinsames Arbeiten mit anderen Konten braucht die App später separate Einladungen und Kalender-Freigaben.
            </div>
        </SidebarSection>
        <PasswordPanel />
        <UserManagementPanel currentUser={currentUser} />
        <div className="settings-info-box rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            Die Einstellungen werden automatisch gespeichert. Neue Nutzer legst du hier als Admin an, damit sie sich auf dieser Installation anmelden können.
        </div>
    </div>
    );
};

const ParentSettingsPanel = ({
    p1Color,
    setP1Color,
    p2Color,
    setP2Color,
    careColor,
    setCareColor,
    p1RecurringRules,
    setP1RecurringRules,
    p2RecurringRules,
    setP2RecurringRules
}) => (
    <div className="space-y-4">
        <SidebarSection title="Eltern" subtitle="Farben und regelmäßige freie Tage für Papa und Mama.">
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
                <RecurringRulesGroup
                    label="Papa"
                    color={p1Color}
                    rules={p1RecurringRules}
                    setRules={setP1RecurringRules}
                />
                <RecurringRulesGroup
                    label="Mama"
                    color={p2Color}
                    rules={p2RecurringRules}
                    setRules={setP2RecurringRules}
                />
            </div>
        </SidebarSection>
    </div>
);

const ChildSettingsPanel = ({ children, childFreeDays, onRefreshFamilyData }) => (
    <div className="space-y-4">
        <SidebarSection title="Kinder" subtitle="Lege Kinder an und entscheide, ob die landesweiten Schulferien für sie gelten.">
            <ChildManager
                children={children}
                onRefreshFamilyData={onRefreshFamilyData}
            />
        </SidebarSection>

        <SidebarSection title="Individuelle freie Tage" subtitle="Für Schließtage, Studientage oder einzelne freie Tage pro Kind.">
            <ChildFreeDayManager
                children={children}
                childFreeDays={childFreeDays}
                onRefreshFamilyData={onRefreshFamilyData}
            />
        </SidebarSection>
    </div>
);

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
    isMobile,
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
    currentUser,
    currentCalendar,
    apiOnline,
    holidayTableOpen,
    setHolidayTableOpen,
    totalNetHolidays,
    holidayBreakdown,
    children,
    childFreeDays,
    onRefreshFamilyData,
    setP1Color,
    setP2Color,
    setCareColor,
    p1RecurringRules,
    setP1RecurringRules,
    p2RecurringRules,
    setP2RecurringRules,
    onCopyShareLink,
    onEnterShareMode,
}) => {
    const tabs = TABS;
    const activeLabel = tabs.find(tab => tab.id === activeTab)?.label ?? 'Werkzeuge';

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
            case 'general':
                return (
                    <GeneralSettingsPanel
                        stateCode={stateCode}
                        setStateCode={setStateCode}
                        currentUser={currentUser}
                        currentCalendar={currentCalendar}
                        apiOnline={apiOnline}
                        holidayTableOpen={holidayTableOpen}
                        setHolidayTableOpen={setHolidayTableOpen}
                        totalNetHolidays={totalNetHolidays}
                        holidayBreakdown={holidayBreakdown}
                        children={children}
                        onCopyShareLink={onCopyShareLink}
                        onEnterShareMode={onEnterShareMode}
                    />
                );
            case 'parents':
                return (
                    <ParentSettingsPanel
                        p1Color={p1Color}
                        setP1Color={setP1Color}
                        p2Color={p2Color}
                        setP2Color={setP2Color}
                        careColor={careColor}
                        setCareColor={setCareColor}
                        p1RecurringRules={p1RecurringRules}
                        setP1RecurringRules={setP1RecurringRules}
                        p2RecurringRules={p2RecurringRules}
                        setP2RecurringRules={setP2RecurringRules}
                    />
                );
            case 'children':
                return (
                    <ChildSettingsPanel
                        children={children}
                        childFreeDays={childFreeDays}
                        onRefreshFamilyData={onRefreshFamilyData}
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
                    utility-sidebar fixed z-50 flex flex-col border-slate-200 bg-white/96 shadow-2xl shadow-slate-300/40 transition-transform dark:border-slate-700 dark:bg-slate-950/96 dark:shadow-black/30
                    ${isMobile ? 'inset-x-0 bottom-0 top-auto h-[78vh] rounded-t-3xl border-t' : 'inset-y-0 right-0 w-[min(94vw,520px)] border-l'}
                    ${isOpen ? 'translate-x-0 translate-y-0' : isMobile ? 'translate-y-full' : 'translate-x-full'}
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
                        {isMobile ? (isOpen ? '↓' : '↑') : (isOpen ? '→' : '←')}
                    </button>
                </div>

                <div className={`flex min-h-0 flex-1 ${isMobile ? 'flex-col' : ''}`}>
                    {isMobile && isOpen && (
                        <nav className="border-b border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {tabs.map((tab) => {
                                    const active = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                                                active
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                                    : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>
                    )}

                    {!isMobile && (
                    <nav className="flex w-16 flex-col items-center gap-2 border-r border-slate-200 bg-slate-50/70 px-2 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                        {tabs.map(tab => {
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
                    )}

                    <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${isOpen ? 'block' : 'hidden lg:hidden'}`}>
                        {renderContent()}
                    </div>
                </div>
            </aside>
        </>
    );
};
