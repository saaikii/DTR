import React from 'react';
import { TimeEntry } from '../types';
import { calculateDailyHours } from '../utils/timeUtils';

interface SummaryProps {
  entries: TimeEntry[];
}

const Summary: React.FC<SummaryProps> = ({ entries }) => {
  let totalActual = 0;
  let totalCredited = 0;

  entries.forEach(entry => {
    const stats = calculateDailyHours(entry);
    totalActual += stats.dailyTotalActual;
    totalCredited += stats.dailyTotalCredited; // This already has the 8h daily cap applied
  });

  // Apply the 40h weekly cap to the cumulative sum
  const finalWeeklyCredited = Math.min(totalCredited, 40);
  
  // Calculate percentage for progress bar
  const progressPercentage = Math.min((totalCredited / 40) * 100, 100);
  const isOverWeeklyCap = totalCredited > 40;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Actual Hours Card */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Actual Hours</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalActual.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Raw sum of all input time</p>
        </div>

        {/* Credited Hours Card */}
        <div className={`rounded-lg p-4 border ${isOverWeeklyCap ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
          <div className="flex justify-between items-start">
             <div>
                <p className={`text-sm font-medium ${isOverWeeklyCap ? 'text-amber-700' : 'text-green-700'}`}>Credited Hours</p>
                <p className={`mt-2 text-3xl font-bold ${isOverWeeklyCap ? 'text-amber-900' : 'text-green-900'}`}>{finalWeeklyCredited.toFixed(2)}</p>
             </div>
             {isOverWeeklyCap && (
                 <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                   Capped at 40
                 </span>
             )}
          </div>
          <p className={`text-xs mt-1 ${isOverWeeklyCap ? 'text-amber-600' : 'text-green-600'}`}>
             Max 40hrs/week & 8hrs/day
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col justify-center bg-gray-50 rounded-lg p-4 border border-gray-100">
           <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
             <span>Weekly Progress</span>
             <span>{totalCredited.toFixed(2)} / 40.00</span>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
             <div 
               className={`h-2.5 rounded-full ${isOverWeeklyCap ? 'bg-amber-500' : 'bg-indigo-600'}`} 
               style={{ width: `${progressPercentage}%` }}
             ></div>
           </div>
           {isOverWeeklyCap && (
               <p className="text-xs text-amber-600 mt-2 text-right">
                   +{ (totalCredited - 40).toFixed(2) } uncredited hrs
               </p>
           )}
        </div>
      </div>
    </div>
  );
};

export default Summary;
