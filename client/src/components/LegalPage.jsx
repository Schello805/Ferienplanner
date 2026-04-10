import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead.jsx';

export const LegalPage = ({ title, description, path, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead title={title} description={description} path={path} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <Link
            to="/"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Zur Startseite
          </Link>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};
