import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GERMAN_STATES } from '../constants/germanStates';
import { SeoHead } from './SeoHead.jsx';

const DRAFT_KEY = 'ferienplanerSetupDraft';

const CHILD_COLOR_PALETTE = ['#f97316', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#06b6d4', '#f472b6'];

const normalizeCalendarSlug = (input) => {
  const raw = String(input || '').trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned;
};

const StepPill = ({ active, done, label }) => {
  const base = 'rounded-full px-3 py-1 text-[11px] font-bold transition-colors';
  if (active) return <div className={`${base} bg-sky-500 text-slate-950`}>{label}</div>;
  if (done) return <div className={`${base} bg-emerald-900/20 text-emerald-200 border border-emerald-900/30`}>{label}</div>;
  return <div className={`${base} border border-slate-700/40 text-slate-300`}>{label}</div>;
};

export const SetupWizard = () => {
  const navigate = useNavigate();

  const [step, setStep] = React.useState(0);

  const [stateCode, setStateCode] = React.useState(() => {
    if (typeof window === 'undefined') return 'BY';
    return localStorage.getItem('stateCode') || 'BY';
  });

  const [calendarSlug, setCalendarSlug] = React.useState('');

  const [p1Color, setP1Color] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('p1Color') : '') || '#22c55e');
  const [p2Color, setP2Color] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('p2Color') : '') || '#3b82f6');
  const [careColor, setCareColor] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('careColor') : '') || '#a855f7');

  const [children, setChildren] = React.useState([]);
  const [childName, setChildName] = React.useState('');
  const [childType, setChildType] = React.useState('school');
  const [childColor, setChildColor] = React.useState('#f97316');
  const [usesSchoolHolidays, setUsesSchoolHolidays] = React.useState(true);

  const [notificationSettings, setNotificationSettings] = React.useState(() => ({
    enabled: true,
    membershipEmailsEnabled: true,
    digestEnabled: true,
    digestMode: 'always',
    digestThresholdDays: 3,
  }));

  const [editingChildIndex, setEditingChildIndex] = React.useState(null);
  const [childNameError, setChildNameError] = React.useState('');

  const [draftSavedAt, setDraftSavedAt] = React.useState(null);

  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft?.stateCode) setStateCode(String(draft.stateCode));
      if (typeof draft?.calendarSlug === 'string') setCalendarSlug(String(draft.calendarSlug));
      if (draft?.colors?.p1Color) setP1Color(String(draft.colors.p1Color));
      if (draft?.colors?.p2Color) setP2Color(String(draft.colors.p2Color));
      if (draft?.colors?.careColor) setCareColor(String(draft.colors.careColor));

      const draftChildren = Array.isArray(draft?.children)
        ? draft.children
        : draft?.child
          ? [draft.child]
          : [];
      const normalized = draftChildren
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({
          name: String(c.name || '').trim(),
          type: String(c.type || 'school'),
          color: c.color ? String(c.color) : '#f97316',
          usesSchoolHolidays: c.usesSchoolHolidays !== false,
        }))
        .filter((c) => c.name);
      if (normalized.length > 0) {
        setChildren(normalized);
        setChildName('');
        setChildType('school');
        setChildColor('#f97316');
        setUsesSchoolHolidays(true);
      }

      if (draft?.notificationSettings && typeof draft.notificationSettings === 'object') {
        setNotificationSettings((current) => ({
          ...current,
          ...draft.notificationSettings,
          digestThresholdDays: Number(draft.notificationSettings.digestThresholdDays ?? current.digestThresholdDays) || 0,
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const getSuggestedChildColor = React.useCallback(
    (existingChildren) => {
      const used = new Set(
        (existingChildren || [])
          .filter((c) => c && typeof c === 'object')
          .map((c) => String(c.color || '').toLowerCase())
      );
      const next = CHILD_COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
      return next || CHILD_COLOR_PALETTE[existingChildren.length % CHILD_COLOR_PALETTE.length] || '#f97316';
    },
    []
  );

  React.useEffect(() => {
    if (editingChildIndex !== null) return;
    if (childName.trim()) return;
    setChildColor((prev) => prev || getSuggestedChildColor(children));
  }, [children, childName, editingChildIndex, getSuggestedChildColor]);

  const steps = [
    { id: 'state', label: 'Bundesland' },
    { id: 'colors', label: 'Farben' },
    { id: 'children', label: 'Kinder' },
    { id: 'emails', label: 'E-Mails' },
    { id: 'done', label: 'Fertig' },
  ];

  const validateStep = () => {
    if (step === 0) {
      if (!stateCode) return 'Bitte ein Bundesland auswählen.';
    }
    if (step === 2) {
      if (!children.length) return 'Bitte mindestens ein Kind anlegen.';
    }
    return '';
  };

  const addChild = () => {
    const name = childName.trim();
    if (!name) {
      setChildNameError('Bitte einen Namen eingeben.');
      return;
    }
    setChildNameError('');
    setError('');
    setChildren((prev) => [
      ...prev,
      {
        name,
        type: childType,
        color: childColor,
        usesSchoolHolidays,
      },
    ]);
    setChildName('');
    setChildType('school');
    setChildColor(getSuggestedChildColor(children.concat([{ name, type: childType, color: childColor, usesSchoolHolidays }])));
    setUsesSchoolHolidays(true);
    setDraftSavedAt(new Date());
  };

  const removeChild = (idx) => {
    setChildren((prev) => prev.filter((_, i) => i !== idx));
    if (editingChildIndex === idx) {
      setEditingChildIndex(null);
      setChildName('');
      setChildType('school');
      setChildColor(getSuggestedChildColor(children.filter((_, i) => i !== idx)));
      setUsesSchoolHolidays(true);
    }
    setDraftSavedAt(new Date());
  };

  const startEditChild = (idx) => {
    const c = children[idx];
    if (!c) return;
    setEditingChildIndex(idx);
    setChildName(String(c.name || ''));
    setChildType(String(c.type || 'school'));
    setChildColor(String(c.color || '#f97316'));
    setUsesSchoolHolidays(c.usesSchoolHolidays !== false);
    setChildNameError('');
    setError('');
  };

  const cancelEditChild = () => {
    setEditingChildIndex(null);
    setChildName('');
    setChildType('school');
    setChildColor(getSuggestedChildColor(children));
    setUsesSchoolHolidays(true);
    setChildNameError('');
  };

  const saveEditedChild = () => {
    if (editingChildIndex === null) return;
    const name = childName.trim();
    if (!name) {
      setChildNameError('Bitte einen Namen eingeben.');
      return;
    }
    setChildNameError('');
    setError('');
    setChildren((prev) =>
      prev.map((c, idx) =>
        idx === editingChildIndex
          ? {
              ...c,
              name,
              type: childType,
              color: childColor,
              usesSchoolHolidays,
            }
          : c
      )
    );
    setEditingChildIndex(null);
    setChildName('');
    setChildType('school');
    setChildColor(getSuggestedChildColor(children));
    setUsesSchoolHolidays(true);
    setDraftSavedAt(new Date());
  };

  const saveDraftAndContinue = () => {
    const nextError = validateStep();
    if (nextError) {
      setError(nextError);
      return;
    }
    setError('');

    if (typeof window !== 'undefined') {
      const payload = {
        stateCode,
        calendarSlug,
        colors: { p1Color, p2Color, careColor },
        children,
        notificationSettings,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }

    setDraftSavedAt(new Date());

    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    navigate('/app');
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead
        title="Einrichtung"
        description="Richte Bundesland, Farben, Kinder und Benachrichtigungen für deinen Familienkalender in Mein Ferienplaner ein."
        path="/setup"
        robots="noindex,nofollow"
      />
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Mein Ferienplaner Logo" className="h-11 w-11 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" />
            <div>
              <div className="text-xl font-black tracking-tight">Einrichtung</div>
              <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">In wenigen Schritten startklar.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Zur Startseite
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {steps.map((s, idx) => (
            <StepPill key={s.id} label={s.label} active={idx === step} done={idx < step} />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          {draftSavedAt && (
            <div className="mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Zwischengespeichert: {draftSavedAt.toLocaleString()}
            </div>
          )}
          {step === 0 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">Bundesland wählen</div>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Bundesland
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {GERMAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pt-2">
                <div className="text-base font-extrabold">Name für den Kalender (optional)</div>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Name für den Kalender
                  <input
                    type="text"
                    value={calendarSlug}
                    onChange={(e) => setCalendarSlug(e.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    placeholder="z.B. familie-mueller"
                  />
                </label>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Hinweis: Dieser Name wird für deinen Familien-Link verwendet, damit ihr später schneller wieder einsteigen könnt. Wenn du nichts angibst, wird automatisch ein zufälliger Link erstellt.
                </div>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                  Vorschau: <span className="font-mono">/k/{normalizeCalendarSlug(calendarSlug) || 'dein-name'}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Das Bundesland steuert Ferien- und Feiertagsdaten.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">Farben festlegen</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Papa
                  <input type="color" value={p1Color} onChange={(e) => setP1Color(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Mama
                  <input type="color" value={p2Color} onChange={(e) => setP2Color(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Betreuung
                  <input type="color" value={careColor} onChange={(e) => setCareColor(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Du kannst die Farben später jederzeit ändern.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">Kinder anlegen</div>

              {children.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Aktuelle Kinder</div>
                  <div className="grid gap-2">
                    {children.map((c, idx) => (
                      <div key={`${c.name}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color || '#f97316' }} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{c.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.type}{c.usesSchoolHolidays ? ' · Schulferien' : ''}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditChild(idx)}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChild(idx)}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {editingChildIndex === null ? 'Neues Kind hinzufügen' : 'Kind bearbeiten'}
              </div>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Name
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => {
                    setChildName(e.target.value);
                    if (childNameError) setChildNameError('');
                  }}
                  onBlur={() => {
                    if (childName.trim()) return;
                    if (childNameError) return;
                    if (editingChildIndex !== null) setChildNameError('Bitte einen Namen eingeben.');
                  }}
                  className={`h-11 rounded-2xl border bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:bg-slate-900 dark:text-white ${childNameError ? 'border-rose-300 dark:border-rose-900/50' : 'border-slate-200 dark:border-slate-700'}`}
                  placeholder="z.B. Emma"
                />
              </label>
              {childNameError && (
                <div className="-mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{childNameError}</div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Typ
                  <select
                    value={childType}
                    onChange={(e) => setChildType(e.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="school">Schule</option>
                    <option value="kita">Kita</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Farbe
                  <input type="color" value={childColor} onChange={(e) => setChildColor(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                  <input type="checkbox" checked={usesSchoolHolidays} onChange={(e) => setUsesSchoolHolidays(e.target.checked)} className="h-4 w-4" />
                  Schulferien nutzen
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {editingChildIndex === null ? (
                  <button
                    type="button"
                    onClick={addChild}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-sky-400"
                  >
                    Kind hinzufügen
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={saveEditedChild}
                      className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-sky-400"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditChild}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Abbrechen
                    </button>
                  </>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Im nächsten Schritt wirst du automatisch zum Login/Setup geführt, falls du noch kein Konto hast.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">E-Mails & Benachrichtigungen</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                Du kannst diese Einstellungen später jederzeit in der Sidebar unter <strong>Benachrichtigungen</strong> ändern.
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Alle E-Mails aktiv</div>
                  <div className="mt-0.5 text-xs opacity-80">Master-Schalter für alle E-Mails.</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(notificationSettings.enabled)}
                  onChange={(e) => setNotificationSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Zugriff auf Kalender</div>
                  <div className="mt-0.5 text-xs opacity-80">E-Mail bei Zugriff erteilt oder entzogen.</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(notificationSettings.membershipEmailsEnabled)}
                  onChange={(e) => setNotificationSettings((prev) => ({ ...prev, membershipEmailsEnabled: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">Jahres-Digest</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  Zeitraum: heute bis 31.12. (ab 01.12. zusätzlich Hinweis fürs Folgejahr)
                </div>

                <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-100">
                  <span>Jahres-Digest aktiv</span>
                  <input
                    type="checkbox"
                    checked={Boolean(notificationSettings.digestEnabled)}
                    onChange={(e) => setNotificationSettings((prev) => ({ ...prev, digestEnabled: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Wann senden?
                    <select
                      value={notificationSettings.digestMode}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, digestMode: e.target.value }))}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="always">Immer senden</option>
                      <option value="threshold">Nur bei &gt; X</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    X (Schwellwert)
                    <input
                      type="number"
                      min={0}
                      max={366}
                      value={Number(notificationSettings.digestThresholdDays) || 0}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, digestThresholdDays: Number(e.target.value) }))}
                      disabled={notificationSettings.digestMode !== 'threshold'}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">Zusammenfassung</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="font-semibold">Bundesland</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">{stateCode}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="font-semibold">Kinder</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">
                    {children.length ? children.map((c) => c.name).join(', ') : '—'}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <div className="font-semibold">Nächster Schritt</div>
                <div className="mt-1 text-xs opacity-80">
                  Klicke auf <strong>Fertig</strong>. Falls du noch nicht eingeloggt bist, wirst du zum Login geleitet. Danach wird alles automatisch übernommen.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={saveDraftAndContinue}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {step === steps.length - 1 ? 'Fertig' : 'Weiter'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Tipp: Du kannst später jederzeit alles in der Sidebar anpassen.
        </div>
      </div>
    </div>
  );
};
