import React from 'react';
import ReactDOM from 'react-dom';
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

const InfoTip = ({ text }) => {
    const [open, setOpen] = React.useState(false);
    const buttonRef = React.useRef(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    const updatePosition = React.useCallback(() => {
        const el = buttonRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const padding = 8;
        const desiredLeft = rect.right;
        const maxLeft = Math.max(padding, window.innerWidth - 288 - padding);
        const left = Math.min(desiredLeft, maxLeft);
        const top = Math.min(rect.bottom + 8, window.innerHeight - padding);
        setPosition({ top, left });
    }, []);

    React.useEffect(() => {
        if (!open) return;
        updatePosition();

        const onPointerDown = (event) => {
            const buttonEl = buttonRef.current;
            if (!buttonEl) return;
            if (buttonEl.contains(event.target)) return;
            setOpen(false);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, updatePosition]);

    return (
        <span className="relative inline-flex">
            <button
                type="button"
                ref={buttonRef}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title={text}
                aria-label={text}
                onClick={() => setOpen((value) => !value)}
            >
                i
            </button>
            {open &&
                ReactDOM.createPortal(
                    <div
                        className="fixed z-[9999] w-72 max-w-[80vw] rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        style={{ top: `${position.top}px`, left: `${position.left}px` }}
                        role="dialog"
                    >
                        {text}
                    </div>,
                    document.body
                )}
        </span>
    );
};

const NotificationPanel = () => {
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [settings, setSettings] = React.useState(() => ({
        enabled: true,
        membershipEmailsEnabled: true,
        digestEnabled: true,
        digestMode: 'always',
        digestThresholdDays: 3,
    }));

    const loadSettings = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await authFetch('/api/notifications/settings');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Einstellungen konnten nicht geladen werden');
            if (data?.settings) {
                setSettings((current) => ({
                    ...current,
                    ...data.settings,
                }));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Einstellungen konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const saveSettings = async () => {
        setSaving(true);
        try {
            const response = await authFetch('/api/notifications/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
            if (data?.settings) {
                setSettings((current) => ({
                    ...current,
                    ...data.settings,
                }));
            }
            toast.success('Gespeichert');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Speichern fehlgeschlagen');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SidebarSection
            title="Benachrichtigungen"
            subtitle="Stelle ein, welche E-Mails du erhalten möchtest. Standardmäßig ist alles aktiviert."
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                <span>Alle E-Mails aktiv</span>
                                <InfoTip text="Master-Schalter: Wenn deaktiviert, werden gar keine E-Mails von Mein Ferienplaner versendet (auch keine Einladungen oder Übersichten)." />
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Master-Schalter für alle E-Mails.</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={Boolean(settings.enabled)}
                            onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                <span>Zugriff auf Kalender</span>
                                <InfoTip text="Du bekommst eine E-Mail, wenn dir Zugriff auf einen Kalender erteilt oder entzogen wird." />
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">E-Mail bei Zugriff erteilt oder entzogen.</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={Boolean(settings.membershipEmailsEnabled)}
                            onChange={(event) => setSettings((current) => ({ ...current, membershipEmailsEnabled: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                    </label>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Jahres-Digest (E-Mail)</div>
                        <InfoTip text="Diese E-Mail fasst unbetreute Tage zusammen (basierend auf Schulferien/Feiertagen, eingetragenen Urlauben/Kindern und deinen wiederkehrenden Regeln)." />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Zeitraum: heute bis 31.12. (Ab 01.12. zusätzlich Hinweis, dass du mit der Planung fürs Folgejahr starten solltest.)
                    </div>

                    <label className="flex items-center justify-between gap-3 pt-2 text-sm">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                <span>Jahres-Digest aktiv</span>
                                <InfoTip text="Wenn deaktiviert, erhältst du keine Jahres-Digest E-Mail (unabhängig vom Modus/Schwellwert)." />
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={Boolean(settings.digestEnabled)}
                            onChange={(event) => setSettings((current) => ({ ...current, digestEnabled: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                    </label>

                    <div className="grid gap-3 pt-2 sm:grid-cols-2">
                        <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between gap-2">
                                <span>Wann senden?</span>
                                <InfoTip text="Immer senden: du bekommst den Digest auch dann, wenn es keine unbetreuten Tage gibt. Schwellwert: du bekommst den Digest nur, wenn die Anzahl unbetreuter Tage im Zeitraum größer als X ist." />
                            </div>
                            <select
                                value={settings.digestMode}
                                onChange={(event) => setSettings((current) => ({ ...current, digestMode: event.target.value }))}
                                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="always">Immer senden</option>
                                <option value="threshold">Nur bei &gt; X</option>
                            </select>
                        </label>
                        <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between gap-2">
                                <span>X (Schwellwert)</span>
                                <InfoTip text="Beispiel: X=3 bedeutet: Digest wird nur gesendet, wenn es im Zeitraum mehr als 3 unbetreute Tage gibt (also 4 oder mehr)." />
                            </div>
                            <input
                                type="number"
                                min={0}
                                max={366}
                                value={Number(settings.digestThresholdDays) || 0}
                                onChange={(event) => setSettings((current) => ({ ...current, digestThresholdDays: Number(event.target.value) }))}
                                disabled={settings.digestMode !== 'threshold'}
                                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                    </div>
                </div>

                <div className="grid gap-2">
                    <button
                        type="button"
                        onClick={saveSettings}
                        disabled={saving}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                    >
                        {saving ? 'Speichere…' : 'Speichern'}
                    </button>
                    <button
                        type="button"
                        onClick={loadSettings}
                        disabled={loading}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                        {loading ? 'Lade…' : 'Neu laden'}
                    </button>
                </div>
            </div>
        </SidebarSection>
    );
};

const AdminToolsPanel = ({ currentUser }) => {
    const [stats, setStats] = React.useState(null);
    const [logs, setLogs] = React.useState([]);
    const [smtpStatus, setSmtpStatus] = React.useState(null);
    const [diagnosticsExporting, setDiagnosticsExporting] = React.useState(false);
    const [browseResource, setBrowseResource] = React.useState('users');
    const [browseQuery, setBrowseQuery] = React.useState('');
    const [browseLimit, setBrowseLimit] = React.useState(50);
    const [browseLoading, setBrowseLoading] = React.useState(false);
    const [browseError, setBrowseError] = React.useState(null);
    const [browseRows, setBrowseRows] = React.useState([]);
    const [smtpDraft, setSmtpDraft] = React.useState(() => ({
        publicBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromAddress: '',
        to: '',
    }));
    const [smtpSending, setSmtpSending] = React.useState(false);
    const [smtpSaving, setSmtpSaving] = React.useState(false);

    const loadAdminData = React.useCallback(async () => {
        if (!isUserAdmin(currentUser)) return;
        try {
            const [statsRes, logsRes] = await Promise.all([
                authFetch('/api/admin/stats'),
                authFetch('/api/admin/logs?limit=50'),
            ]);

            const statsData = await statsRes.json();
            const logsData = await logsRes.json();

            if (!statsRes.ok) throw new Error(statsData.error || 'Admin-Statistiken konnten nicht geladen werden');
            if (!logsRes.ok) throw new Error(logsData.error || 'Admin-Logs konnten nicht geladen werden');

            setStats(statsData);
            setLogs(Array.isArray(logsData.entries) ? logsData.entries.slice().reverse() : []);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Admin-Daten konnten nicht geladen werden');
        }
    }, [currentUser]);

    const loadSmtpSettings = React.useCallback(async () => {
        if (!isUserAdmin(currentUser)) return;
        try {
            const response = await authFetch('/api/admin/smtp');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'SMTP-Daten konnten nicht geladen werden');
            setSmtpStatus(data);

            if (data?.settings) {
                setSmtpDraft((current) => ({
                    ...current,
                    publicBaseUrl: data.settings.publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
                    host: data.settings.host || '',
                    port: data.settings.port || 587,
                    secure: Boolean(data.settings.secure),
                    user: data.settings.user || '',
                    fromAddress: data.settings.fromAddress || '',
                    pass: '',
                }));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'SMTP-Daten konnten nicht geladen werden');
        }
    }, [currentUser]);

    React.useEffect(() => {
        loadAdminData();
        loadSmtpSettings();
    }, [loadAdminData, loadSmtpSettings]);

    if (!isUserAdmin(currentUser)) {
        return null;
    }

    const exportDiagnostics = async () => {
        setDiagnosticsExporting(true);
        try {
            const response = await authFetch('/api/admin/diagnostics');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Diagnostics Export fehlgeschlagen');

            const payload = JSON.stringify(data, null, 2);
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `mein-ferienplaner-diagnostics-${ts}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);

            toast.success('Diagnostics Export wurde heruntergeladen');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Diagnostics Export fehlgeschlagen');
        } finally {
            setDiagnosticsExporting(false);
        }
    };

    const loadBrowseRows = async () => {
        setBrowseLoading(true);
        setBrowseError(null);
        try {
            const params = new URLSearchParams({
                resource: browseResource,
                query: browseQuery,
                limit: String(browseLimit),
            });
            const response = await authFetch(`/api/admin/browse?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Daten konnten nicht geladen werden');
            setBrowseRows(Array.isArray(data.rows) ? data.rows : []);
        } catch (error) {
            console.error(error);
            setBrowseRows([]);
            setBrowseError(error.message || 'Daten konnten nicht geladen werden');
        } finally {
            setBrowseLoading(false);
        }
    };

    const saveSmtpSettings = async () => {
        setSmtpSaving(true);
        try {
            const response = await authFetch('/api/admin/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicBaseUrl: smtpDraft.publicBaseUrl,
                    host: smtpDraft.host,
                    port: smtpDraft.port,
                    secure: smtpDraft.secure,
                    user: smtpDraft.user,
                    pass: smtpDraft.pass,
                    fromAddress: smtpDraft.fromAddress,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'SMTP speichern fehlgeschlagen');
            toast.success('SMTP gespeichert');
            await loadSmtpSettings();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'SMTP speichern fehlgeschlagen');
        } finally {
            setSmtpSaving(false);
        }
    };

    const sendTestMail = async () => {
        setSmtpSending(true);
        try {
            const response = await authFetch('/api/admin/smtp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: smtpDraft.to }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'SMTP Test fehlgeschlagen');
            toast.success('SMTP Testmail wurde gesendet');
            await loadAdminData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'SMTP Test fehlgeschlagen');
        } finally {
            setSmtpSending(false);
        }
    };

    return (
        <div className="space-y-4">
            <SidebarSection title="Instanz" subtitle="Zahlen zur Datenbank und zum Betrieb dieser Installation.">
                {!stats ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Lädt…
                    </div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {[
                            ['User', stats.users],
                            ['Kalender', stats.calendars],
                            ['Freigaben', stats.memberships],
                            ['Kinder', stats.children],
                            ['Freie Tage', stats.childFreeDays],
                            ['Einträge', stats.vacationEntries],
                            ['Sessions', stats.activeSessions],
                            ['Einladungen', stats.pendingInvites],
                            ['E-Mail offen', stats.pendingEmailVerifications],
                            ['User unverifiziert', stats.unverifiedUsers],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                                <div className="font-semibold">{label}</div>
                                <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</div>
                            </div>
                        ))}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            <div className="font-semibold">DB Größe</div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                                {typeof stats.dbSizeBytes === 'number' ? `${Math.round(stats.dbSizeBytes / 1024)} KB` : '–'}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            <div className="font-semibold">Uptime</div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{stats.uptimeSeconds}s</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            <div className="font-semibold">Server</div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{stats.serverVersion || '–'}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            <div className="font-semibold">SMTP</div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                                {stats.smtpConfigured ? 'konfiguriert' : 'nicht aktiv'}
                            </div>
                            {stats.smtpUpdatedAt && (
                                <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Updated: {stats.smtpUpdatedAt}</div>
                            )}
                        </div>
                    </div>
                )}
            </SidebarSection>

            <SidebarSection title="Diagnostics" subtitle="Export für Fehleranalyse (ohne Secrets/Tokens).">
                <button
                    type="button"
                    onClick={exportDiagnostics}
                    disabled={diagnosticsExporting}
                    className="w-full max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                    {diagnosticsExporting ? 'Exportiere…' : 'Diagnostics exportieren'}
                </button>
            </SidebarSection>

            <SidebarSection title="Datenbank" subtitle="Read-only Ansicht (Admin).">
                <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-3">
                        <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Tabelle
                            <select
                                value={browseResource}
                                onChange={(event) => setBrowseResource(event.target.value)}
                                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="users">users</option>
                                <option value="calendars">calendars</option>
                                <option value="vacation_entries">vacation_entries</option>
                            </select>
                        </label>

                        <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">
                            Suche (id/Name/Datum)
                            <input
                                type="text"
                                value={browseQuery}
                                onChange={(event) => setBrowseQuery(event.target.value)}
                                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                placeholder="z.B. 1 oder max oder 2026-08"
                            />
                        </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                        <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Limit
                            <select
                                value={browseLimit}
                                onChange={(event) => setBrowseLimit(Number(event.target.value))}
                                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </label>

                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={loadBrowseRows}
                                disabled={browseLoading}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                                {browseLoading ? 'Lade…' : 'Laden'}
                            </button>
                        </div>
                    </div>

                    {browseError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                            {browseError}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="max-h-64 overflow-auto bg-white dark:bg-slate-950">
                            <table className="min-w-full text-left text-xs">
                                <tbody>
                                    {browseRows.length === 0 ? (
                                        <tr>
                                            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">Keine Daten.</td>
                                        </tr>
                                    ) : (
                                        browseRows.map((row, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''}>
                                                <td className="px-3 py-2">
                                                    <pre className="max-w-full whitespace-pre-wrap break-words text-[11px] leading-snug text-slate-800 dark:text-slate-100">{JSON.stringify(row, null, 2)}</pre>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </SidebarSection>

            <SidebarSection title="SMTP" subtitle="E-Mail Versand wird über Environment Variablen konfiguriert. Hier kannst du die Werte testen.">
                <div className="space-y-3">
                    {smtpStatus && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            <div className="font-semibold">Status</div>
                            <div className="mt-1 grid gap-1">
                                <div>Konfiguriert: <strong>{smtpStatus.configured ? 'ja' : 'nein'}</strong></div>
                                <div>Quelle: <strong>{smtpStatus.source || '–'}</strong></div>
                                <div>APP Secret Key: <strong>{smtpStatus.keyConfigured ? 'ok' : 'fehlt'}</strong></div>
                                <div>Passwort gespeichert: <strong>{smtpStatus.settings?.passConfigured ? 'ja' : 'nein'}</strong></div>
                            </div>
                        </div>
                    )}

                    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Public Base URL
                        <input
                            type="text"
                            value={smtpDraft.publicBaseUrl}
                            onChange={(event) => setSmtpDraft((current) => ({ ...current, publicBaseUrl: event.target.value }))}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </label>

                    <div className="grid gap-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            SMTP Host
                            <input
                                type="text"
                                value={smtpDraft.host}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, host: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Port
                            <input
                                type="number"
                                min={1}
                                max={65535}
                                value={smtpDraft.port}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, port: Number(event.target.value) }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={smtpDraft.secure}
                            onChange={(event) => setSmtpDraft((current) => ({ ...current, secure: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        Secure (TLS)
                    </label>

                    <div className="grid gap-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            SMTP User
                            <input
                                type="text"
                                value={smtpDraft.user}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, user: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            SMTP Passwort
                            <input
                                type="password"
                                value={smtpDraft.pass}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, pass: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                autoComplete="new-password"
                                placeholder={smtpStatus?.settings?.passConfigured ? '•••••••• (leer lassen zum Beibehalten)' : ''}
                            />
                        </label>
                    </div>

                    <div className="grid gap-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            From
                            <input
                                type="text"
                                value={smtpDraft.fromAddress}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, fromAddress: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Test-Empfänger
                            <input
                                type="email"
                                value={smtpDraft.to}
                                onChange={(event) => setSmtpDraft((current) => ({ ...current, to: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                autoComplete="email"
                            />
                        </label>
                    </div>

                    <div className="grid gap-2">
                        <button
                            type="button"
                            onClick={saveSmtpSettings}
                            disabled={smtpSaving}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                        >
                            {smtpSaving ? 'Speichere…' : 'Speichern'}
                        </button>
                        <button
                            type="button"
                            onClick={sendTestMail}
                            disabled={smtpSending}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                        >
                            {smtpSending ? 'Sende…' : 'Testmail senden'}
                        </button>
                    </div>
                </div>
            </SidebarSection>

            <SidebarSection title="Admin Log" subtitle="Letzte Ereignisse dieser Instanz (In-Memory, nicht persistent).">
                {logs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Noch keine Einträge.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.slice(0, 40).map((entry, idx) => (
                            <div key={`${entry.ts}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-semibold text-slate-900 dark:text-white">{entry.event}</div>
                                    <div className="text-[10px] text-slate-400">{entry.ts}</div>
                                </div>
                                {entry.detail && <div className="mt-1 text-slate-600 dark:text-slate-300">{entry.detail}</div>}
                            </div>
                        ))}
                    </div>
                )}
                <button
                    type="button"
                    onClick={loadAdminData}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                    Aktualisieren
                </button>
            </SidebarSection>
        </div>
    );
};

const InvitationPanel = ({ currentCalendar }) => {
    const [role, setRole] = React.useState('editor');
    const [expiresInDays, setExpiresInDays] = React.useState(14);
    const [inviteUrl, setInviteUrl] = React.useState('');
    const [inviteEmail, setInviteEmail] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [emailSending, setEmailSending] = React.useState(false);
    const [members, setMembers] = React.useState([]);
    const [membersLoading, setMembersLoading] = React.useState(false);

    const isOwner = Boolean(currentCalendar && currentCalendar.role === 'owner');

    const loadMembers = React.useCallback(async () => {
        if (!isOwner) return;
        setMembersLoading(true);
        try {
            const response = await authFetch('/api/calendar/members');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Mitglieder konnten nicht geladen werden');
            setMembers(Array.isArray(data.members) ? data.members : []);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Mitglieder konnten nicht geladen werden');
            setMembers([]);
        } finally {
            setMembersLoading(false);
        }
    }, [isOwner]);

    React.useEffect(() => {
        if (!isOwner) return;
        loadMembers();
    }, [loadMembers, currentCalendar?.id, isOwner]);

    if (!isOwner) {
        return null;
    }

    const removeMember = async (userId) => {
        const ok = window.confirm('Möchtest du diesem Benutzer wirklich den Zugriff auf den Kalender entziehen?');
        if (!ok) return;
        try {
            const response = await authFetch(`/api/calendar/members/${userId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Entfernen fehlgeschlagen');
            toast.success('Freigabe entfernt');
            await loadMembers();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Entfernen fehlgeschlagen');
        }
    };

    const createInvitation = async () => {
        setLoading(true);
        try {
            const response = await authFetch('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, expiresInDays }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Einladung konnte nicht erstellt werden');
            setInviteUrl(data.inviteUrl || '');
            toast.success('Einladungslink erstellt');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Einladung konnte nicht erstellt werden');
        } finally {
            setLoading(false);
        }
    };

    const copyInviteUrl = async () => {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success('Einladungslink kopiert');
        } catch (error) {
            console.error(error);
            toast.error('Einladungslink konnte nicht kopiert werden');
        }
    };

    const sendInviteEmail = async () => {
        if (!inviteEmail.trim()) {
            toast.error('Bitte eine E-Mail-Adresse angeben');
            return;
        }
        setEmailSending(true);
        try {
            const response = await authFetch('/api/invitations/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, expiresInDays, email: inviteEmail.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Einladung konnte nicht gesendet werden');
            setInviteUrl(data.inviteUrl || '');
            setInviteEmail('');
            toast.success('Einladung gesendet');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Einladung konnte nicht gesendet werden');
        } finally {
            setEmailSending(false);
        }
    };

    return (
        <SidebarSection title="Einladung" subtitle="Erstelle einen Link, damit andere Konten diesem Kalender beitreten können.">
            <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Rolle
                        <select
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            <option value="viewer">Nur ansehen</option>
                            <option value="editor">Bearbeiten</option>
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Gültig (Tage)
                        <input
                            type="number"
                            min={1}
                            max={90}
                            value={expiresInDays}
                            onChange={(event) => setExpiresInDays(Number(event.target.value))}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </label>
                </div>

                <button
                    type="button"
                    onClick={createInvitation}
                    disabled={loading}
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                >
                    {loading ? 'Erstelle …' : 'Einladungslink erstellen'}
                </button>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Einladung per E-Mail senden</div>
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="E-Mail-Adresse"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        autoComplete="email"
                    />
                    <button
                        type="button"
                        onClick={sendInviteEmail}
                        disabled={emailSending}
                        className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                    >
                        {emailSending ? 'Sende …' : 'Einladung senden'}
                    </button>
                </div>

                {inviteUrl && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                        <div className="break-all font-mono">{inviteUrl}</div>
                        <button
                            type="button"
                            onClick={copyInviteUrl}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            Link kopieren
                        </button>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">Mitglieder</div>
                        <button
                            type="button"
                            onClick={loadMembers}
                            disabled={membersLoading}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            {membersLoading ? 'Lade…' : 'Aktualisieren'}
                        </button>
                    </div>
                    <div className="mt-2 space-y-2">
                        {members.length === 0 ? (
                            <div className="text-slate-500 dark:text-slate-400">Noch keine weiteren Mitglieder.</div>
                        ) : (
                            members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                                    <div className="min-w-0">
                                        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{m.username}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</div>
                                    </div>
                                    {m.role !== 'owner' && (
                                        <button
                                            type="button"
                                            onClick={() => removeMember(m.id)}
                                            className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-900 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/50"
                                        >
                                            Entfernen
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </SidebarSection>
    );
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

const isUserAdmin = (user) => Boolean(user?.isAdmin ?? user?.is_admin ?? user?.admin);

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
        id: 'share',
        label: 'Teilen',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.066 2.186 2.25 2.25 0 0 0-3.066-2.186Zm0-12.814a2.25 2.25 0 1 0 3.066-2.186 2.25 2.25 0 0 0-3.066 2.186Z" />
            </svg>
        )
    },
    {
        id: 'profile',
        label: 'Profil',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.964 0a9 9 0 1 0-11.964 0m11.964 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        )
    },
    {
        id: 'notifications',
        label: 'Benachrichtigungen',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
        )
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4 text-amber-500 dark:text-amber-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M12 3l7.5 4.5v6c0 5.25-3.75 8.25-7.5 9-3.75-.75-7.5-3.75-7.5-9v-6L12 3Z" />
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
                onClick={() => setRules((current) => [...current, createEmptyRule()])}
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
                    onChangeRule={(nextRule) => setRules((current) => current.map((item) => item.id === rule.id ? nextRule : item))}
                    onRemoveRule={() => setRules((current) => (current.length > 1 ? current.filter((item) => item.id !== rule.id) : [createEmptyRule()]))}
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
    const [draft, setDraft] = React.useState({ username: '', password: '' });

    const loadUsers = React.useCallback(async () => {
        if (!isUserAdmin(currentUser)) return;
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

    if (!isUserAdmin(currentUser)) {
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
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Benutzer konnte nicht angelegt werden');
            setDraft({ username: '', password: '' });
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
    shareMode,
    onToggleShareMode,
    onCopyShareLink,
}) => {
    const [slugDraft, setSlugDraft] = React.useState('');
    const [slugSaving, setSlugSaving] = React.useState(false);

    React.useEffect(() => {
        if (currentCalendar?.slug) {
            setSlugDraft(String(currentCalendar.slug));
        }
    }, [currentCalendar?.slug]);

    const totals = holidayBreakdown.reduce((acc, holiday) => {
        acc.calendarDays += holiday.calendarDays;
        acc.netDays += holiday.netDays;
        return acc;
    }, { calendarDays: 0, netDays: 0 });

    const calendarUrl = React.useMemo(() => {
        if (typeof window === 'undefined') return '';
        const slug = currentCalendar?.slug;
        if (!slug) return '';
        return `${window.location.origin}/k/${slug}`;
    }, [currentCalendar?.slug]);

    const copyCalendarUrl = async () => {
        if (!calendarUrl) return;
        try {
            await navigator.clipboard.writeText(calendarUrl);
            toast.success('Kalender-URL kopiert');
        } catch (error) {
            console.error(error);
            toast.error('Kalender-URL konnte nicht kopiert werden');
        }
    };

    const saveSlug = async () => {
        setSlugSaving(true);
        try {
            const response = await authFetch('/api/calendar/slug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: slugDraft }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Slug konnte nicht gespeichert werden');
            toast.success('Kalender-URL gespeichert');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Slug konnte nicht gespeichert werden');
        } finally {
            setSlugSaving(false);
        }
    };

    return (
    <div className="space-y-4">
        <SidebarSection title="Kalenderkontext" subtitle="Wer arbeitet gerade in welchem Kalender?">
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-3 py-3 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100">
                <div className="font-semibold">{currentCalendar?.name || 'Mein Kalender'}</div>
                <div className="mt-1 text-xs opacity-80">
                    Angemeldet als <strong>{currentUser?.username || 'Unbekannt'}</strong>. Kinder, freie Tage, Urlaube und Regeln werden in diesem Kalender gespeichert.
                </div>
            </div>
            {currentCalendar?.role === 'owner' && (
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <div className="font-semibold">Kalender-URL</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Wähle einen eindeutigen Slug (klein, mit Bindestrichen). Beispiel: <span className="font-mono">familie-mueller</span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <input
                            type="text"
                            value={slugDraft}
                            onChange={(event) => setSlugDraft(event.target.value)}
                            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="familie-mueller"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={saveSlug}
                            disabled={slugSaving}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-900 px-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                            {slugSaving ? 'Speichere…' : 'Speichern'}
                        </button>
                        <button
                            type="button"
                            onClick={copyCalendarUrl}
                            disabled={!calendarUrl}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            Link kopieren
                        </button>
                    </div>
                    {calendarUrl && (
                        <div className="mt-2 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                            {calendarUrl}
                        </div>
                    )}
                </div>
            )}
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

        <SidebarSection title="Aktionen" subtitle="Schnellzugriff auf häufig genutzte Funktionen.">
            <div className="grid gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onCopyShareLink}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 md:hidden"
                >
                    Ansichtslink kopieren
                </button>
                <button
                    type="button"
                    onClick={onToggleShareMode}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors md:hidden ${shareMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/50' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                >
                    {shareMode ? 'Freigabe beenden' : 'Freigabe starten'}
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                    Drucken
                </button>
            </div>
        </SidebarSection>

        <UserManagementPanel currentUser={currentUser} />
        <div className="settings-info-box rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            Die Einstellungen werden automatisch gespeichert. Neue Nutzer legst du hier als Admin an, damit sie sich auf dieser Installation anmelden können.
        </div>
    </div>
    );
};

const SharePanel = ({ currentCalendar, onCopyShareLink, onEnterShareMode }) => (
    <div className="space-y-4">
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
        </SidebarSection>

        <InvitationPanel currentCalendar={currentCalendar} />
    </div>
);

const ProfilePanel = ({ currentUser, onLogout }) => {
    const [newEmail, setNewEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [deletePassword, setDeletePassword] = React.useState('');
    const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
    const [deleting, setDeleting] = React.useState(false);

    const requestEmailChange = async (event) => {
        event.preventDefault();
        if (!newEmail.trim() || !password) {
            toast.error('Bitte neue E-Mail und Passwort angeben');
            return;
        }

        setSaving(true);
        try {
            const response = await authFetch('/api/auth/change-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, newEmail: newEmail.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'E-Mail konnte nicht geändert werden');
            setNewEmail('');
            setPassword('');
            toast.success('Bestätigungs-E-Mail wurde an die neue Adresse gesendet');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'E-Mail konnte nicht geändert werden');
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Bitte Passwort eingeben');
            return;
        }
        if (deleteConfirmText.trim().toLowerCase() !== 'löschen') {
            toast.error('Bitte zur Bestätigung "LÖSCHEN" eingeben');
            return;
        }

        const ok = window.confirm('Möchtest du dein Konto und alle zugehörigen Kalenderdaten wirklich unwiderruflich löschen?');
        if (!ok) return;

        setDeleting(true);
        try {
            const response = await authFetch('/api/auth/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');

            toast.success('Konto wurde gelöscht');
            setDeletePassword('');
            setDeleteConfirmText('');
            await onLogout();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Löschen fehlgeschlagen');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            <SidebarSection title="Profil" subtitle="Konto-Informationen und persönliche Einstellungen.">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                    <div className="font-semibold">{currentUser?.username || 'Unbekannt'}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Angemeldetes Konto</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            <div className="font-semibold">E-Mail</div>
                            <div className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">
                                {currentUser?.email || '—'}
                            </div>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-xs ${currentUser?.emailVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100'}`}>
                            <div className="font-semibold">Verifikation</div>
                            <div className="mt-1 text-sm font-bold">{currentUser?.emailVerified ? 'Bestätigt' : 'Offen'}</div>
                        </div>
                    </div>
                </div>
            </SidebarSection>

            <SidebarSection title="E-Mail ändern" subtitle="Die neue Adresse wird erst nach Klick auf den Bestätigungslink übernommen.">
                <form onSubmit={requestEmailChange} className="space-y-3">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        placeholder="Neue E-Mail-Adresse"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        autoComplete="email"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Passwort bestätigen"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        autoComplete="current-password"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                    >
                        {saving ? 'Sende…' : 'Bestätigungs-Mail senden'}
                    </button>
                </form>
            </SidebarSection>

            <PasswordPanel />

            <SidebarSection title="Account löschen" subtitle="Entfernt dein Profil, deinen Kalender und alle gespeicherten Daten unwiderruflich.">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                    <div className="font-semibold">Achtung: Dies kann nicht rückgängig gemacht werden.</div>
                    <div className="mt-1 text-xs opacity-80">Gelöscht werden u.a. Kinder, Einträge, Freigaben/Einladungen und Link-Namen.</div>
                </div>
                <div className="mt-3 space-y-2">
                    <input
                        type="password"
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        placeholder="Passwort bestätigen"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        autoComplete="current-password"
                    />
                    <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(event) => setDeleteConfirmText(event.target.value)}
                        placeholder='Zur Bestätigung: LÖSCHEN'
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                        type="button"
                        onClick={deleteAccount}
                        disabled={deleting}
                        className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/50"
                    >
                        {deleting ? 'Lösche…' : 'Account & Daten endgültig löschen'}
                    </button>
                </div>
            </SidebarSection>

            <SidebarSection title="Sitzung" subtitle="Dein Konto verwalten.">
                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/50"
                >
                    Abmelden
                </button>
            </SidebarSection>
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
    shareMode,
    onToggleShareMode,
    onLogout,
}) => {
    const isAdmin = isUserAdmin(currentUser);
    const tabs = isAdmin ? TABS : TABS.filter((tab) => tab.id !== 'admin');
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
                            children={children}
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
                        shareMode={shareMode}
                        onToggleShareMode={onToggleShareMode}
                        onCopyShareLink={onCopyShareLink}
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
            case 'share':
                return (
                    <SharePanel
                        currentCalendar={currentCalendar}
                        onCopyShareLink={onCopyShareLink}
                        onEnterShareMode={onEnterShareMode}
                    />
                );
            case 'profile':
                return <ProfilePanel currentUser={currentUser} onLogout={onLogout} />;
            case 'notifications':
                return <NotificationPanel />;
            case 'admin':
                return <AdminToolsPanel currentUser={currentUser} />;
            case 'help':
            default:
                return <HelpPanel />;
        }
    };

    return (
        <>
            <div
                className={`fixed inset-0 z-20 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
            />

            <aside
                className={`
                    utility-sidebar fixed z-30 flex flex-col border-slate-200 bg-white/96 shadow-2xl shadow-slate-300/40 transition-transform dark:border-slate-700 dark:bg-slate-950/96 dark:shadow-black/30
                    ${isMobile ? 'inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] top-auto h-[80svh] rounded-t-3xl border-t' : 'inset-y-0 right-0 w-[min(94vw,520px)] border-l'}
                    ${isOpen ? 'translate-x-0 translate-y-0' : isMobile ? 'translate-y-full' : 'translate-x-full'}
                    lg:static lg:z-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-xl
                    ${isOpen ? 'lg:w-[480px]' : 'lg:w-[64px]'}
                `}
            >
                <div className={`flex items-center justify-between border-b border-slate-200 px-3 dark:border-slate-700 ${isMobile ? 'py-2' : 'py-3'}`}>
                    <div className={`overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:hidden'}`}>
                        {!isMobile && (
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Utility Sidebar</div>
                        )}
                        <div className={`font-bold text-slate-800 dark:text-white ${isMobile ? 'text-base' : 'text-sm'}`}>{activeLabel}</div>
                    </div>
                    {!isMobile && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            title={isOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
                        >
                            {isOpen ? '→' : '←'}
                        </button>
                    )}
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

                    <div className={`min-h-0 flex-1 overflow-y-auto p-3 overscroll-contain pb-4 [-webkit-overflow-scrolling:touch] ${isOpen ? 'block' : 'hidden lg:hidden'}`}>
                        {renderContent()}
                    </div>

                    {isMobile && isOpen && (
                        <div className="sticky bottom-0 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/96">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                                Schließen
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};
