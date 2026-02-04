import React, { useMemo } from 'react';
import { TimeEntry, CalculatedHours } from '../types';
import { calculateDailyHours, formatDecimalHours } from '../utils/timeUtils';
import { ExclamationCircleIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimesheetProps {
  entries: TimeEntry[];
  onUpdateEntry: (id: string, field: keyof TimeEntry, value: string) => void;
  onClearEntry: (id: string) => void;
}

const Timesheet: React.FC<TimesheetProps> = ({ entries, onUpdateEntry, onClearEntry }) => {
  
  // Calculate stats for each row to display
  const rowStats: Record<string, CalculatedHours> = useMemo(() => {
    const stats: Record<string, CalculatedHours> = {};
    entries.forEach(entry => {
      stats[entry.id] = calculateDailyHours(entry);
    });
    return stats;
  }, [entries]);

  const handleSetTime = (id: string, field: keyof TimeEntry) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    onUpdateEntry(id, field, `${hours}:${minutes}`);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6 sticky left-0 bg-gray-50 z-10 shadow-r">
              Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 bg-blue-50/50 border-l border-gray-200">
              Morning In
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 bg-blue-50/50">
              Morning Out
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 bg-amber-50/50 border-l border-gray-200">
              Afternoon In
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 bg-amber-50/50">
              Afternoon Out
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-gray-900 border-l border-gray-200 w-24">
              AM Hours
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-gray-900 w-24">
              PM Hours
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-bold text-indigo-900 bg-indigo-50 border-l border-indigo-100 w-28">
              Daily Total
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 w-16">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {entries.map((entry) => {
            const stats = rowStats[entry.id];
            const hasError = !stats.isValid;
            const isWeekend = new Date(entry.date).getDay() % 6 === 0;

            return (
              <tr key={entry.id} className={`${isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors group`}>
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-transparent shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {hasError && (
                     <div className="group/tooltip relative inline-block ml-2 align-middle">
                       <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                       <div className="absolute left-0 bottom-full mb-2 hidden w-48 rounded bg-red-800 p-2 text-xs text-white group-hover/tooltip:block z-50">
                          {stats.errors.join(", ")}
                       </div>
                     </div>
                  )}
                </td>
                
                {/* Morning Inputs */}
                <td className="whitespace-nowrap px-2 py-2 border-l border-gray-200">
                  {entry.morningIn ? (
                    <input
                      type="time"
                      value={entry.morningIn}
                      onChange={(e) => onUpdateEntry(entry.id, 'morningIn', e.target.value)}
                      className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm text-center font-medium"
                    />
                  ) : (
                    <button
                      onClick={() => handleSetTime(entry.id, 'morningIn')}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      <span>Time In</span>
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  {entry.morningOut ? (
                    <input
                      type="time"
                      value={entry.morningOut}
                      onChange={(e) => onUpdateEntry(entry.id, 'morningOut', e.target.value)}
                      className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm text-center font-medium"
                    />
                  ) : (
                    <button
                      onClick={() => handleSetTime(entry.id, 'morningOut')}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      <span>Time Out</span>
                    </button>
                  )}
                </td>

                {/* Afternoon Inputs */}
                <td className="whitespace-nowrap px-2 py-2 border-l border-gray-200">
                  {entry.afternoonIn ? (
                    <input
                      type="time"
                      value={entry.afternoonIn}
                      onChange={(e) => onUpdateEntry(entry.id, 'afternoonIn', e.target.value)}
                      className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm text-center font-medium"
                    />
                  ) : (
                    <button
                      onClick={() => handleSetTime(entry.id, 'afternoonIn')}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      <span>Time In</span>
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  {entry.afternoonOut ? (
                    <input
                      type="time"
                      value={entry.afternoonOut}
                      onChange={(e) => onUpdateEntry(entry.id, 'afternoonOut', e.target.value)}
                      className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm text-center font-medium"
                    />
                  ) : (
                    <button
                      onClick={() => handleSetTime(entry.id, 'afternoonOut')}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      <span>Time Out</span>
                    </button>
                  )}
                </td>

                {/* Calculations */}
                <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-500 border-l border-gray-200">
                  {formatDecimalHours(stats.morningHours)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-500">
                  {formatDecimalHours(stats.afternoonHours)}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 text-right text-sm font-medium border-l border-indigo-100 ${stats.dailyTotalActual > 8 ? 'text-amber-600' : 'text-indigo-900'}`}>
                  {formatDecimalHours(stats.dailyTotalActual)}
                  {stats.dailyTotalActual > 8 && (
                     <span className="text-[10px] text-gray-400 block leading-tight">Cap: 8.00</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-center">
                    <button 
                        onClick={() => onClearEntry(entry.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Clear Row"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Timesheet;