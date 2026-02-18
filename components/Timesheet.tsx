import React, { useMemo } from 'react';
import { TimeEntry, CalculatedHours } from '../types';
import { calculateDailyHours, formatDecimalHours } from '../utils/timeUtils';
import { ExclamationCircleIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimesheetProps {
  entries: TimeEntry[];
  targetHours: number;
  onUpdateEntry: (id: string, field: keyof TimeEntry, value: string) => void;
  onClearEntry: (id: string) => void;
}

const Timesheet: React.FC<TimesheetProps> = ({ entries, targetHours, onUpdateEntry, onClearEntry }) => {
  
  // 1. Calculate stats for every row
  const calculations = useMemo(() => {
    let currentRemaining = targetHours;
    
    return entries.map(entry => {
        const stats = calculateDailyHours(entry);
        // Subtract credited hours (capped at 8) from remaining
        currentRemaining = currentRemaining - stats.dailyTotalCredited;
        
        return {
            ...stats,
            remainingAfter: currentRemaining
        };
    });
  }, [entries, targetHours]);

  // 2. Group entries by week (chunks of 5)
  const weeks = useMemo(() => {
      const chunks = [];
      for (let i = 0; i < entries.length; i += 5) {
          const weekEntries = entries.slice(i, i + 5);
          const weekStats = calculations.slice(i, i + 5);
          
          // Calculate weekly total
          const weeklyTotalCredited = weekStats.reduce((sum, stat) => sum + stat.dailyTotalCredited, 0);

          chunks.push({
              entries: weekEntries,
              stats: weekStats,
              weeklyTotalCredited
          });
      }
      return chunks;
  }, [entries, calculations]);

  const handleSetTime = (id: string, field: keyof TimeEntry) => {
    // Automatic fixed times
    if (field === 'morningOut') {
      onUpdateEntry(id, field, '12:00');
      return;
    }
    if (field === 'afternoonIn') {
      onUpdateEntry(id, field, '13:00');
      return;
    }
    if (field === 'afternoonOut') {
      onUpdateEntry(id, field, '17:00');
      return;
    }

    // For other fields (Morning In), use the current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    onUpdateEntry(id, field, `${hours}:${minutes}`);
  };

  const weekColors = [
      'bg-orange-100/50', // Week 1 - Yellowish
      'bg-amber-100/50',  // Week 2 - Orangey
      'bg-rose-100/50',   // Week 3 - Reddish
      'bg-blue-100/50',   // Week 4 - Blueish
  ];

  return (
    <div className="overflow-x-auto rounded-none border border-black shadow-sm bg-white">
      <table className="min-w-full border-collapse">
        {/* Custom Header matching the image */}
        <thead>
            <tr className="bg-white">
                <th colSpan={2} className="border border-black px-2 py-1 text-left text-xs font-bold text-black uppercase">
                    NO. OF HRS
                </th>
                <th className="border border-black px-2 py-1 text-left text-sm font-bold text-black">
                    {targetHours}
                </th>
                {/* Spans remaining columns including new action column */}
                <th colSpan={7} className="border border-black bg-white"></th>
            </tr>
            <tr className="bg-white">
                <th rowSpan={2} className="w-24 border border-black text-center text-xs font-bold text-black uppercase bg-white">
                    WEEK
                </th>
                 <th rowSpan={2} className="w-32 border border-black text-center text-xs font-bold text-black uppercase bg-white">
                    DATE
                </th>
                <th colSpan={2} className="border border-black py-2 text-center text-xs font-bold text-black uppercase">
                    AM
                </th>
                <th colSpan={2} className="border border-black py-2 text-center text-xs font-bold text-black uppercase">
                    PM
                </th>
                <th rowSpan={2} className="w-16 border border-black px-1 text-center text-[10px] font-bold text-black uppercase leading-tight">
                    NO. OF HOURS
                </th>
                <th rowSpan={2} className="w-24 border border-black px-1 text-center text-[10px] font-bold text-black uppercase leading-tight bg-yellow-50">
                    NO. OF HOURS RENDERED PER WEEK
                </th>
                <th rowSpan={2} className="w-24 border border-black px-1 text-center text-[10px] font-bold text-black uppercase leading-tight">
                    NO. OF HOURS REMAIN
                </th>
                <th rowSpan={2} className="w-10 border border-black px-1 text-center text-[10px] font-bold text-black uppercase leading-tight">
                    {/* Action */}
                </th>
            </tr>
            <tr className="bg-white">
                <th className="border border-black px-1 py-1 text-center text-[10px] font-bold text-black uppercase w-20">
                    TIME IN
                </th>
                <th className="border border-black px-1 py-1 text-center text-[10px] font-bold text-black uppercase w-20">
                    TIME OUT
                </th>
                <th className="border border-black px-1 py-1 text-center text-[10px] font-bold text-black uppercase w-20">
                    TIME IN
                </th>
                <th className="border border-black px-1 py-1 text-center text-[10px] font-bold text-black uppercase w-20">
                    TIME OUT
                </th>
            </tr>
        </thead>
        
        <tbody className="text-sm">
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
                {week.entries.map((entry, entryIndex) => {
                    const stats = week.stats[entryIndex];
                    const isFirstRow = entryIndex === 0;
                    const weekColor = weekColors[weekIndex % weekColors.length];

                    return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                            {/* Week Label - Rowspan 5 */}
                            {isFirstRow && (
                                <td rowSpan={5} className={`border border-black text-center text-xs font-bold text-black ${weekColor}`}>
                                    WEEK {weekIndex + 1}
                                </td>
                            )}

                            {/* Date */}
                            <td className="border border-black px-2 py-1 text-xs text-center font-bold text-gray-900 whitespace-nowrap bg-white">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>

                            {/* AM IN */}
                            <td className="border border-black px-1 py-1 bg-white h-8">
                                {entry.morningIn ? (
                                    <input
                                    type="time"
                                    value={entry.morningIn}
                                    onChange={(e) => onUpdateEntry(entry.id, 'morningIn', e.target.value)}
                                    className="w-full h-full text-center text-xs border-0 p-0 focus:ring-0 bg-white text-gray-900 font-medium"
                                    />
                                ) : (
                                    <button 
                                      onClick={() => handleSetTime(entry.id, 'morningIn')} 
                                      className="w-full h-full text-[10px] text-blue-600/50 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center font-medium"
                                    >
                                        Time In
                                    </button>
                                )}
                            </td>

                            {/* AM OUT */}
                            <td className="border border-black px-1 py-1 bg-white h-8">
                                {entry.morningOut ? (
                                    <input
                                    type="time"
                                    value={entry.morningOut}
                                    onChange={(e) => onUpdateEntry(entry.id, 'morningOut', e.target.value)}
                                    className="w-full h-full text-center text-xs border-0 p-0 focus:ring-0 bg-white text-gray-900 font-medium"
                                    />
                                ) : (
                                    <button 
                                      onClick={() => handleSetTime(entry.id, 'morningOut')} 
                                      className="w-full h-full text-[10px] text-blue-600/50 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center font-medium"
                                    >
                                        Time Out
                                    </button>
                                )}
                            </td>

                            {/* PM IN */}
                            <td className="border border-black px-1 py-1 bg-white h-8">
                                {entry.afternoonIn ? (
                                    <input
                                    type="time"
                                    value={entry.afternoonIn}
                                    onChange={(e) => onUpdateEntry(entry.id, 'afternoonIn', e.target.value)}
                                    className="w-full h-full text-center text-xs border-0 p-0 focus:ring-0 bg-white text-gray-900 font-medium"
                                    />
                                ) : (
                                    <button 
                                      onClick={() => handleSetTime(entry.id, 'afternoonIn')} 
                                      className="w-full h-full text-[10px] text-amber-600/50 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center font-medium"
                                    >
                                        Time In
                                    </button>
                                )}
                            </td>

                            {/* PM OUT */}
                            <td className="border border-black px-1 py-1 bg-white h-8">
                                {entry.afternoonOut ? (
                                    <input
                                    type="time"
                                    value={entry.afternoonOut}
                                    onChange={(e) => onUpdateEntry(entry.id, 'afternoonOut', e.target.value)}
                                    className="w-full h-full text-center text-xs border-0 p-0 focus:ring-0 bg-white text-gray-900 font-medium"
                                    />
                                ) : (
                                    <button 
                                      onClick={() => handleSetTime(entry.id, 'afternoonOut')} 
                                      className="w-full h-full text-[10px] text-amber-600/50 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center font-medium"
                                    >
                                        Time Out
                                    </button>
                                )}
                            </td>

                            {/* Daily Total */}
                            <td className={`border border-black px-2 py-1 text-center text-xs font-bold text-black ${weekColor}`}>
                                {formatDecimalHours(stats.dailyTotalCredited)}
                            </td>

                            {/* Weekly Total - Rowspan 5 */}
                            {isFirstRow && (
                                <td rowSpan={5} className={`border border-black text-center text-sm font-bold text-black ${weekColor}`}>
                                    {formatDecimalHours(week.weeklyTotalCredited)}
                                </td>
                            )}

                            {/* Remaining Hours */}
                            <td className="border border-black px-2 py-1 text-center text-xs font-bold text-black bg-white">
                                {formatDecimalHours(stats.remainingAfter)}
                            </td>

                            {/* Action Button */}
                            <td className="border border-black px-1 py-1 text-center bg-white">
                                <button 
                                    onClick={() => onClearEntry(entry.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                    title="Reset row"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </React.Fragment>
          ))}
          
          {/* Total Footer Row */}
          <tr>
              <td colSpan={7} className="border border-black px-4 py-2 text-right font-bold text-sm uppercase text-black">
                  TOTAL NO. OF HOURS
              </td>
              <td className="border border-black px-4 py-2 text-center font-bold text-lg text-black bg-white">
                  {formatDecimalHours(calculations.reduce((sum, s) => sum + s.dailyTotalCredited, 0))}
              </td>
              {/* Cover Remaining + Action columns */}
              <td colSpan={2} className="border border-black bg-gray-100"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Helper to check if entry has any data
const entryHasData = (e: TimeEntry) => !!(e.morningIn || e.morningOut || e.afternoonIn || e.afternoonOut);

export default Timesheet;