import React from 'react';
import { getCellLabelStyle } from '../lib/cellContrast.js';

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
    let borderClass = "border-gray-200 dark:border-slate-800";
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
    const isUnattended = status.requiresCare && !status.isWeekend && !status.publicHoliday && 
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
    const childMarkers = (status.childrenNeedingCare || []).slice(0, 3);
    const extraChildrenCount = Math.max((status.childrenNeedingCare || []).length - childMarkers.length, 0);
    const labelStyle = getCellLabelStyle(status.p1 && status.p2 ? [p1Color, p2Color]
        : status.p1 ? [p1Color] : status.p2 ? [p2Color] : status.care ? [careColor] : []);
    const contentLeft = childMarkers.length > 0 ? `${24 + childMarkers.length * 6 + (extraChildrenCount > 0 ? 16 : 0)}px` : '20px';
    const dayNumberColorClass = status.p1 || status.p2 || status.care
        ? 'text-white/85'
        : 'text-slate-500 dark:text-slate-300/75';

    return (
        <div
            onMouseDown={(e) => onMouseDown(status.dateString, e)}
            onMouseEnter={(e) => onMouseEnter(status.dateString, e, status)}
            onMouseLeave={onMouseLeave}
            onClick={() => onClick(status.dateString)}
            className={`
                calendar-day-cell ${status.publicHoliday ? 'calendar-day-cell-with-holiday' : ''} h-6 sm:h-7 rounded-md ${bgClass} border ${borderClass}
                relative cursor-pointer
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

            {/* Day number - visible in every valid month cell */}
            <span style={labelStyle} className={`day-cell-number pointer-events-none absolute left-1 top-1 z-20 font-mono text-[7px] font-bold leading-none ${dayNumberColorClass}`}>
                {status.date.getDate()}
            </span>

            {/* Contrast follows the actual fill instead of repeating a badge in every cell. */}
            <span style={labelStyle} className="day-cell-weekday absolute top-0.5 right-1 rounded-sm px-0.5 text-[8px] leading-none font-semibold font-mono pointer-events-none text-slate-600 dark:text-slate-300">
                {weekday}
            </span>

            {childMarkers.length > 0 && (
                <div className="day-cell-child-markers absolute bottom-1 left-1 z-10 flex items-center gap-0.5 pointer-events-none">
                    {childMarkers.map((child) => (
                        <span
                            key={`${status.dateString}-child-${child.childId}`}
                            className="day-cell-child-marker h-1.5 w-1.5 rounded-full ring-1 ring-white/70 dark:ring-slate-950/80"
                            style={{ backgroundColor: child.childColor || '#f59e0b' }}
                            title={child.childName}
                        />
                    ))}
                    {extraChildrenCount > 0 && (
                        <span className="rounded-full bg-slate-900/80 px-1 text-[7px] font-bold leading-3 text-white dark:bg-white/80 dark:text-slate-900">
                            +{extraChildrenCount}
                        </span>
                    )}
                </div>
            )}

            {/* Loading Spinner */}
            {isSaving && (
                <div className="absolute inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-30">
                    <div className="w-3 h-3 border-2 border-slate-600 dark:border-white/50 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
                </div>
            )}

            {/* Reserve the left and right metadata lanes; full names remain available on hover. */}
            {status.publicHoliday && (
                <span
                    className="day-cell-holiday-text absolute right-5 top-1/2 -translate-y-1/2 truncate text-[7px] sm:text-[8px] leading-tight text-center text-red-900 dark:text-white font-normal z-20"
                    style={{ ...labelStyle, left: contentLeft }}
                    title={status.publicHoliday}
                >
                    {status.publicHoliday}
                </span>
            )}

            {/* Care Icon/Text */}
            {status.care && !status.p1 && !status.p2 && !status.publicHoliday && (
                <span style={{ ...labelStyle, left: contentLeft }} className="absolute right-5 top-1/2 -translate-y-1/2 text-center text-[10px] sm:text-xs text-white font-bold z-10">
                    B
                </span>
            )}

            {/* Warning Icon - Very Prominent */}
            {isUnattended && (
                <div style={{ left: contentLeft }} className="absolute inset-y-0 right-5 flex items-center justify-center z-10">
                    <span className="text-red-600 dark:text-red-500 text-xl font-black drop-shadow-md">!</span>
                </div>
            )}
        </div>
    );
};
