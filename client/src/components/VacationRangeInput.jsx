import React, { useState } from 'react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
        <form onSubmit={handleSubmit} className="vacation-input-form flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm transition-colors no-print">
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Von</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-primary outline-none"
                    required
                />
            </div>
            
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bis</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-primary outline-none"
                    required
                />
            </div>

            <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wer</label>
                    <div className="wer-toggle-container flex bg-gray-100 dark:bg-slate-800 rounded p-0.5 border border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={() => setUserId('p1')}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${userId === 'p1' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Papa"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p1Color }}></div>
                        <span className="hidden sm:inline">Papa</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserId('p2')}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${userId === 'p2' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Mama"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p2Color }}></div>
                        <span className="hidden sm:inline">Mama</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserId('both')}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${userId === 'both' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
                        className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${userId === 'care' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
                className="px-4 py-1.5 bg-slate-900 dark:bg-primary text-white text-xs font-bold rounded hover:bg-slate-800 dark:hover:bg-sky-600 disabled:opacity-50 transition-colors h-[30px]"
            >
                {loading ? 'Speichern…' : 'Eintragen'}
            </button>
        </form>
    );
};
