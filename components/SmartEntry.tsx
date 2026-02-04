import React, { useState } from 'react';
import { parseTimeEntry } from '../services/geminiService';
import { TimeEntry, GeminiStatus } from '../types';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface SmartEntryProps {
  onEntriesParsed: (entries: Partial<TimeEntry>[]) => void;
  currentDate: string;
}

const SmartEntry: React.FC<SmartEntryProps> = ({ onEntriesParsed, currentDate }) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<GeminiStatus>(GeminiStatus.IDLE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus(GeminiStatus.LOADING);
    try {
      const parsedEntries = await parseTimeEntry(input, currentDate);
      onEntriesParsed(parsedEntries);
      setStatus(GeminiStatus.SUCCESS);
      setInput('');
      // Reset success status after a moment
      setTimeout(() => setStatus(GeminiStatus.IDLE), 2000);
    } catch (error) {
      setStatus(GeminiStatus.ERROR);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-2">
        <SparklesIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-800">Smart Fill with Gemini</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Type freely like "Worked 8 to 5 on Monday and Tuesday" or "Mon: 9-12, 1-6".
      </p>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. I worked from 8am to 5pm yesterday with an hour lunch break..."
          className="w-full pl-4 pr-24 py-3 text-sm text-gray-900 bg-gray-50 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          disabled={status === GeminiStatus.LOADING}
        />
        <button
          type="submit"
          disabled={status === GeminiStatus.LOADING || !input.trim()}
          className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {status === GeminiStatus.LOADING ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            'Auto-Fill'
          )}
        </button>
      </form>
      {status === GeminiStatus.ERROR && (
        <p className="text-xs text-red-500 mt-2">Failed to interpret input. Please try again.</p>
      )}
      {status === GeminiStatus.SUCCESS && (
        <p className="text-xs text-green-600 mt-2">Successfully updated timesheet!</p>
      )}
    </div>
  );
};

export default SmartEntry;
