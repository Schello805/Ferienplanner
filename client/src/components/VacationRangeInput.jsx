import React, { useState } from 'react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const VacationRangeInput = ({ 
    startDate, 
    setStartDate, 
    endDate, 
    setEndDate, 
    userId, 
    setUserId, 
    onUpdate, 
    onSubmitRange,
    p1Color, 
    p2Color,
    careColor
}) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!startDate || !endDate) {
            toast.error('Bitte Start- und Enddatum wählen');
            return;
        }

        if (startDate > endDate) {
            toast.error('Startdatum muss vor Enddatum liegen');
            return;
        }

        setLoading(true);
        try {
            if (onSubmitRange) {
                await onSubmitRange({ startDate, endDate, userId });
            } else {
                const res = await fetch(`${API_URL}/api/vacations/range`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startDate, endDate, userId })
                });

                if (!res.ok) throw new Error('Failed to save');

                toast.success('Urlaub eingetragen');
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="vacation-input-form flex flex-wrap items-end gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors no-print">
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Von</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    required
                />
            </div>
            
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bis</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    required
                />
            </div>

            <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wer</label>
                    <div className="wer-toggle-container flex rounded-xl border border-gray-200 bg-gray-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => setUserId('p1')}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${userId === 'p1' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Papa"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p1Color }}></div>
                        <span className="hidden sm:inline">Papa</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserId('p2')}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${userId === 'p2' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Mama"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p2Color }}></div>
                        <span className="hidden sm:inline">Mama</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserId('both')}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${userId === 'both' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Beide"
                    >
                        <div className="flex -space-x-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p1Color }}></div>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p2Color }}></div>
                        </div>
                        <span className="hidden sm:inline">Beide</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserId('care')}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${userId === 'care' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Betreuung (Oma/Opa/Hort)"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: careColor }}></div>
                        <span className="hidden sm:inline">Betreuung</span>
                    </button>
                    </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="h-[32px] rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-primary dark:hover:bg-sky-600"
            >
                {loading ? 'Speichern…' : 'Eintragen'}
            </button>
        </form>
    );
};
