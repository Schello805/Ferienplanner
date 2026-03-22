export const Footer = () => {
    return (
        <footer className="mt-2 hidden border-t border-gray-100 py-2 text-center text-[11px] text-gray-400 dark:border-slate-800 dark:text-gray-600 md:block print:hidden">
            <p>&copy; {new Date().getFullYear()} Familien-Ferienplaner. Alle Rechte vorbehalten.</p>
            <div className="mt-0.5 flex items-center justify-center gap-3">
                <p>Optimiert für die Jahresübersicht.</p>
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
    );
};
