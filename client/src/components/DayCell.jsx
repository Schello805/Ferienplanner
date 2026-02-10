import React from 'react';

export const DayCell = ({ 
    status, // The calculated status object for this day
    savingDate, 
    p1Color, 
    p2Color,
    careColor,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
    onClick
}) => {
    if (status === 'invalid') {
        return <div className="bg-transparent" />;
    }

    // Logic for styling
    let bgClass = ""; // Default: Transparent (shows container bg)
    let borderClass = "border-gray-100 dark:border-slate-800";
    let inlineStyle = {};

    // 1. Weekends (Gray)
    if (status.isWeekend) {
        bgClass = "bg-gray-100 dark:bg-slate-950 day-cell-weekend"; // Darker than slate-900
        borderClass = "border-gray-200 dark:border-slate-800";
    }

    // 2. School Holidays (Subtle background)
    if (status.schoolHoliday && !status.isWeekend) {
        bgClass = "bg-amber-50 dark:bg-amber-900/10 day-cell-school-holiday"; // More subtle
    }

    // 3. Public Holidays (Readable)
    if (status.publicHoliday) {
        bgClass = "bg-red-100 dark:bg-red-900/60 day-cell-public-holiday"; // Darker red
        borderClass = "border-red-200 dark:border-red-900";
    }

    // 4. Vacation Overrides (Dynamic Colors)
    if (status.p1 && status.p2) {
        inlineStyle = { background: `linear-gradient(135deg, ${p1Color}, ${p2Color})` };
        borderClass = "border-white/20";
        bgClass = ""; // Override class bg
    } else if (status.p1) {
        inlineStyle = { backgroundColor: p1Color };
        borderClass = "border-white/20";
        bgClass = ""; // Override class bg
    } else if (status.p2) {
        inlineStyle = { backgroundColor: p2Color };
        borderClass = "border-white/20";
        bgClass = ""; // Override class bg
    } else if (status.care) {
        inlineStyle = { backgroundColor: careColor };
        borderClass = "border-white/20";
        bgClass = ""; // Override class bg
    } else if (status.isP1Free && status.isP2Free) {
        // Both free: Split border effect using box-shadow
        inlineStyle = { boxShadow: `inset 4px 0 0 0 ${p1Color}, inset -4px 0 0 0 ${p2Color}` };
    } else if (status.isP1Free) {
        // P1 Free: Inset border
        inlineStyle = { boxShadow: `inset 0 0 0 3px ${p1Color}` };
    } else if (status.isP2Free) {
        // P2 Free: Inset border
        inlineStyle = { boxShadow: `inset 0 0 0 3px ${p2Color}` };
    }

    // 5. Conflict Check (Unattended)
    const isUnattended = status.schoolHoliday && !status.isWeekend && !status.publicHoliday && 
                         !status.p1 && !status.p2 && !status.care && 
                         !status.isP1Free && !status.isP2Free;
    
    if (isUnattended) {
        bgClass = "bg-red-50 dark:bg-red-950/30 day-cell-unattended"; // Red tint
        borderClass = "border-red-500 animate-pulse"; // Pulsing red border
    }

    // 6. Selection Feedback (Drag)
    if (status.isSelected) {
        borderClass += " z-20";
    }

    const isSaving = savingDate === status.dateString;
    const weekday = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][status.date.getDay()];

    return (
        <div
            onMouseDown={(e) => onMouseDown(status.dateString, e)}
            onMouseEnter={(e) => onMouseEnter(status.dateString, e, status)}
            onMouseLeave={onMouseLeave}
            onClick={() => onClick(status.dateString)}
            className={`
                h-6 sm:h-7 rounded-md ${bgClass} border ${borderClass}
                relative cursor-pointer hover:brightness-95 dark:hover:brightness-110 hover:z-10 transition-all duration-75
                flex flex-col justify-center items-center overflow-hidden
            `}
            style={inlineStyle}
        >
            {status.isSelected && (
                <div
                    className={`absolute inset-0 pointer-events-none ${
                        status.isRangeStart && status.isRangeEnd
                            ? 'rounded-md'
                            : status.isRangeStart
                                ? 'rounded-l-md rounded-r-none'
                                : status.isRangeEnd
                                    ? 'rounded-r-md rounded-l-none'
                                    : 'rounded-none'
                    }`}
                    style={{
                        backgroundColor: 'rgba(14, 165, 233, 0.14)',
                        boxShadow: 'inset 0 1px 0 rgba(14, 165, 233, 0.55), inset 0 -1px 0 rgba(14, 165, 233, 0.55)'
                    }}
                />
            )}

            {status.isSelected && (status.isRangeStart || status.isRangeEnd) && (
                <div
                    className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full bg-primary shadow-sm pointer-events-none"
                />
            )}

            {/* Weekday - Small & Subtle */}
            <span className="day-cell-weekday absolute top-0.5 right-1 text-[8px] opacity-40 font-mono pointer-events-none text-slate-900 dark:text-white">
                {weekday}
            </span>

            {/* Loading Spinner */}
            {isSaving && (
                <div className="absolute inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-30">
                    <div className="w-3 h-3 border-2 border-slate-600 dark:border-white/50 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
                </div>
            )}

            {/* Public Holiday Text - Full visibility */}
            {status.publicHoliday && (
                <span className="day-cell-holiday-text text-[9px] sm:text-[10px] leading-tight text-center w-full px-0.5 text-red-900 dark:text-white font-bold z-20 break-words">
                    {status.publicHoliday}
                </span>
            )}

            {/* Care Icon/Text */}
            {status.care && !status.p1 && !status.p2 && (
                <span className="text-[10px] sm:text-xs text-white font-bold z-10 drop-shadow-md">
                    B
                </span>
            )}

            {/* Warning Icon - Very Prominent */}
            {isUnattended && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-red-600 dark:text-red-500 text-xl font-black drop-shadow-md">!</span>
                </div>
            )}
        </div>
    );
};
