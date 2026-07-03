import React from 'react';
import { Link } from 'react-router-dom';
import { ChangelogModal } from './ChangelogModal.jsx';
import { FeedbackModal } from './FeedbackModal.jsx';

export const Footer = () => {
    const [changelogOpen, setChangelogOpen] = React.useState(false);
    const [feedbackOpen, setFeedbackOpen] = React.useState(false);
    const [updateAvailable, setUpdateAvailable] = React.useState(false);
    const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

    React.useEffect(() => {
        let cancelled = false;

        const checkVersion = async () => {
            try {
                const response = await fetch('/health', {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const data = await response.json();
                if (cancelled) return;
                const serverVersion = typeof data?.version === 'string' ? data.version : null;
                setUpdateAvailable(Boolean(serverVersion && serverVersion !== version));
            } catch {
                if (!cancelled) {
                    setUpdateAvailable(false);
                }
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        checkVersion();
        window.addEventListener('focus', checkVersion);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', checkVersion);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [version]);

    const reloadForUpdate = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="fixed bottom-24 right-3 z-[70] rounded-full border border-sky-200 bg-sky-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 md:hidden print:hidden"
                title="Feedback senden"
            >
                Feedback
            </button>

            <footer className="mt-2 hidden border-t border-gray-100 py-2 text-center text-[11px] text-gray-400 dark:border-slate-800 dark:text-gray-600 md:block print:hidden">
                <p>&copy; {new Date().getFullYear()} Mein Ferienplaner. Alle Rechte vorbehalten.</p>
                <div className="mt-0.5 flex items-center justify-center gap-3">
                    <Link
                        to="/hilfe"
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Hilfe öffnen"
                    >
                        Hilfe
                    </Link>
                    <button
                        type="button"
                        onClick={() => setFeedbackOpen(true)}
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Feedback senden"
                    >
                        Feedback
                    </button>
                    <a
                        href="/impressum"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Impressum öffnen"
                    >
                        Impressum
                    </a>
                    <a
                        href="/datenschutz"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Datenschutzerklärung öffnen"
                    >
                        Datenschutz
                    </a>
                    <a
                        href="/cookies"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Cookiehinweis öffnen"
                    >
                        Cookies
                    </a>
                    <button
                        type="button"
                        onClick={() => setChangelogOpen(true)}
                        className="rounded-lg px-1 py-0.5 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="Changelog anzeigen"
                    >
                        Revision {version}
                    </button>
                    {updateAvailable && (
                        <button
                            type="button"
                            onClick={reloadForUpdate}
                            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                            title="Neue Version laden"
                        >
                            Update verfuegbar
                        </button>
                    )}
                    <a
                        href="https://github.com/Schello805/Ferienplanner"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gray-500 transition-colors hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                        title="GitHub Repository öffnen"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.589 2 12.248c0 4.527 2.865 8.368 6.839 9.724.5.096.682-.223.682-.495 0-.245-.008-.894-.013-1.754-2.782.619-3.369-1.37-3.369-1.37-.455-1.186-1.11-1.502-1.11-1.502-.908-.636.069-.623.069-.623 1.004.072 1.532 1.055 1.532 1.055.892 1.566 2.341 1.114 2.91.852.091-.663.35-1.114.636-1.37-2.22-.259-4.555-1.14-4.555-5.074 0-1.121.389-2.038 1.029-2.757-.103-.26-.446-1.305.098-2.72 0 0 .84-.276 2.75 1.053A9.35 9.35 0 0 1 12 6.836c.85.004 1.706.117 2.505.345 1.909-1.33 2.747-1.053 2.747-1.053.546 1.415.203 2.46.1 2.72.64.719 1.027 1.636 1.027 2.757 0 3.944-2.339 4.812-4.566 5.067.359.319.679.948.679 1.911 0 1.379-.012 2.49-.012 2.828 0 .274.18.595.688.494C19.138 20.613 22 16.773 22 12.248 22 6.589 17.523 2 12 2Z" clipRule="evenodd" />
                        </svg>
                        <span>GitHub</span>
                    </a>
                </div>
            </footer>

            <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
            <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} version={version} />
        </>
    );
};
