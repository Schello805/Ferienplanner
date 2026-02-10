export const Footer = () => {
    return (
        <footer className="mt-8 py-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-slate-800">
            <p>&copy; {new Date().getFullYear()} Familien-Ferienplaner. Alle Rechte vorbehalten.</p>
            <p className="mt-1">Entwickelt mit ❤️ für Bayern.</p>
        </footer>
    );
};
