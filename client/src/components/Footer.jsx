export const Footer = () => {
    return (
        <footer className="mt-2 hidden border-t border-gray-100 py-2 text-center text-[11px] text-gray-400 dark:border-slate-800 dark:text-gray-600 md:block print:hidden">
            <p>&copy; {new Date().getFullYear()} Familien-Ferienplaner. Alle Rechte vorbehalten.</p>
            <p className="mt-0.5">Optimiert für die Jahresübersicht.</p>
        </footer>
    );
};
