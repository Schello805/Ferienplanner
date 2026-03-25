import React from 'react';

const getAppVersion = () => {
  try {
    return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
  } catch {
    return '0.0.0';
  }
};

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    if (typeof window !== 'undefined' && window?.console?.error) {
      console.error('Unhandled UI error', error, errorInfo);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const version = getAppVersion();
    const message = this.state.error?.message ? String(this.state.error.message) : 'Unbekannter Fehler';
    const stack = this.state.error?.stack ? String(this.state.error.stack) : '';
    const componentStack = this.state.errorInfo?.componentStack ? String(this.state.errorInfo.componentStack) : '';

    const details = [
      `Mein Ferienplaner - Fehlerbericht`,
      `Version: ${version}`,
      `Zeitpunkt: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `Message: ${message}`,
      stack ? `\nStack:\n${stack}` : '',
      componentStack ? `\nComponentStack:\n${componentStack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const copyDetails = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(details);
          return true;
        }
      } catch {
        // ignore
      }
      try {
        const el = document.createElement('textarea');
        el.value = details;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
      } catch {
        return false;
      }
    };

    const reload = () => {
      try {
        if (typeof window !== 'undefined') window.location.reload();
      } catch {
        // ignore
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="text-xl font-black tracking-tight">Etwas ist schiefgelaufen</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bitte lade die Seite neu. Wenn das Problem bleibt, kopiere die Fehlerdetails und schicke sie uns.
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={reload}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Neu laden
              </button>
              <button
                type="button"
                onClick={() => copyDetails()}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Fehlerdetails kopieren
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              <div className="font-bold text-slate-700 dark:text-slate-200">Kurzinfo</div>
              <div className="mt-1">Version: {version}</div>
              <div className="mt-1">Fehler: {message}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
