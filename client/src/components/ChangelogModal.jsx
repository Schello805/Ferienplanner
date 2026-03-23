import React from 'react';

export const ChangelogModal = ({ open, onClose, version }) => {
    const [content, setContent] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!open) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch('/CHANGELOG.md', { cache: 'no-store' });
                const text = await response.text();
                if (!response.ok) {
                    throw new Error('Changelog konnte nicht geladen werden');
                }
                if (cancelled) return;
                setContent(text);
            } catch (e) {
                if (cancelled) return;
                setError(e?.message || 'Changelog konnte nicht geladen werden');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={onClose}>
            <div
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Changelog"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Changelog</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Revision {version}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                        Schließen
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-auto px-4 py-3">
                    {loading ? (
                        <div className="text-sm text-slate-600 dark:text-slate-300">Lade…</div>
                    ) : error ? (
                        <div className="text-sm text-rose-700 dark:text-rose-200">{error}</div>
                    ) : (
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">{content}</pre>
                    )}
                </div>
            </div>
        </div>
    );
};
