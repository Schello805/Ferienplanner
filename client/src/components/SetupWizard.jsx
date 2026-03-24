import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GERMAN_STATES } from '../constants/germanStates';

const DRAFT_KEY = 'ferienplanerSetupDraft';

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

  const [p1Color, setP1Color] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('p1Color') : '') || '#22c55e');
  const [p2Color, setP2Color] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('p2Color') : '') || '#3b82f6');
  const [careColor, setCareColor] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('careColor') : '') || '#a855f7');

  const [childName, setChildName] = React.useState('');
  const [childType, setChildType] = React.useState('school');
  const [childColor, setChildColor] = React.useState('#f97316');
  const [usesSchoolHolidays, setUsesSchoolHolidays] = React.useState(true);

  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft?.stateCode) setStateCode(String(draft.stateCode));
      if (draft?.colors?.p1Color) setP1Color(String(draft.colors.p1Color));
      if (draft?.colors?.p2Color) setP2Color(String(draft.colors.p2Color));
      if (draft?.colors?.careColor) setCareColor(String(draft.colors.careColor));
      if (draft?.child?.name) setChildName(String(draft.child.name));
      if (draft?.child?.type) setChildType(String(draft.child.type));
      if (draft?.child?.color) setChildColor(String(draft.child.color));
      if (typeof draft?.child?.usesSchoolHolidays === 'boolean') setUsesSchoolHolidays(Boolean(draft.child.usesSchoolHolidays));
    } catch {
      // ignore
    }
  }, []);

  const steps = [
    { id: 'state', label: 'Bundesland' },
    { id: 'colors', label: 'Farben' },
    { id: 'child', label: 'Kind' },
    { id: 'done', label: 'Fertig' },
  ];

  const validateStep = () => {
    if (step === 0) {
      if (!stateCode) return 'Bitte ein Bundesland auswählen.';
    }
    if (step === 2) {
      if (!childName.trim()) return 'Bitte mindestens ein Kind anlegen (Name fehlt).';
    }
    return '';
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
        colors: { p1Color, p2Color, careColor },
        child: {
          name: childName.trim(),
          type: childType,
          color: childColor,
          usesSchoolHolidays,
        },
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }

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
              <div className="text-base font-extrabold">Kind anlegen</div>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Name
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="z.B. Emma"
                />
              </label>
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
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Im nächsten Schritt wirst du automatisch zum Login/Setup geführt, falls du noch kein Konto hast.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-base font-extrabold">Zusammenfassung</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="font-semibold">Bundesland</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">{stateCode}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="font-semibold">Kind</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">{childName.trim() || '—'}</div>
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
