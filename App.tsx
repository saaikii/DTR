import React, { useState, useEffect } from 'react';
import Timesheet from './components/Timesheet';
import Summary from './components/Summary';
import { TimeEntry } from './types';
import { getWeekDays, calculateDailyHours } from './utils/timeUtils';
import { CalendarDaysIcon, DocumentArrowDownIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import XLSX from 'xlsx';

const App: React.FC = () => {
  // Initialize with current week
  const [entries, setEntries] = useState<TimeEntry[]>(() => getWeekDays(new Date()));
  const [userInfo, setUserInfo] = useState({ name: '', office: '' });

  // Auto-save/load entries
  useEffect(() => {
    const saved = localStorage.getItem('dtr-entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
           setEntries(parsed);
        }
      } catch (e) {
        console.error("Failed to load saved entries");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dtr-entries', JSON.stringify(entries));
  }, [entries]);

  // Auto-save/load user info
  useEffect(() => {
    const savedUser = localStorage.getItem('dtr-user-info');
    if (savedUser) {
        try {
            setUserInfo(JSON.parse(savedUser));
        } catch(e) {}
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('dtr-user-info', JSON.stringify(userInfo));
  }, [userInfo]);

  const handleUpdateEntry = (id: string, field: keyof TimeEntry, value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleClearEntry = (id: string) => {
      setEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, morningIn: '', morningOut: '', afternoonIn: '', afternoonOut: '', notes: '' } : entry
      ));
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all entries for this week?")) {
        setEntries(getWeekDays(new Date()));
    }
  };

  const exportToExcel = () => {
      const wb = XLSX.utils.book_new();

      // Data Arrays
      const titleRow = [["DAILY TIME RECORD"]];
      const spacer = [[""]];
      const infoRows = [
          ["Employee Name:", userInfo.name],
          ["Office / Dept:", userInfo.office]
      ];
      const headerRow = [
        "Date", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", 
        "AM Hours", "PM Hours", "Total Hours", "Credited (Max 8)"
      ];

      // Calculate Data and Totals
      let totalActual = 0;
      let totalCreditedSum = 0;

      const dataRows = entries.map(e => {
        const stats = calculateDailyHours(e);
        totalActual += stats.dailyTotalActual;
        totalCreditedSum += stats.dailyTotalCredited;

        return [
          e.date,
          e.morningIn,
          e.morningOut,
          e.afternoonIn,
          e.afternoonOut,
          stats.morningHours || 0,
          stats.afternoonHours || 0,
          stats.dailyTotalActual || 0,
          stats.dailyTotalCredited || 0
        ];
      });

      const finalWeeklyCredited = Math.min(totalCreditedSum, 40);

      // Summary Rows (Aligned to the right columns)
      // We use empty strings to push the labels to column G (index 6) and H (index 7)
      const summaryHeaderRow = ["", "", "", "", "", "", "WEEKLY SUMMARY", "", ""];
      const summaryActualRow = ["", "", "", "", "", "", "Total Actual:", totalActual.toFixed(2), ""];
      const summaryCreditedRow = ["", "", "", "", "", "", "Total Credited:", totalCreditedSum.toFixed(2), ""];
      const summaryFinalRow = ["", "", "", "", "", "", "FINAL (Max 40h):", finalWeeklyCredited.toFixed(2), ""];

      // Assemble all data
      const wsData = [
          ...titleRow,
          ...spacer,
          ...infoRows,
          ...spacer,
          headerRow,
          ...dataRows,
          ...spacer,
          summaryActualRow,
          summaryCreditedRow,
          summaryFinalRow
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // --- Styling ---
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");

      // Styles Definitions
      const borderAll = {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } }
      };

      const styleTitle = {
          font: { bold: true, sz: 16, color: { rgb: "4338CA" } }, // Indigo-700
          alignment: { horizontal: "center", vertical: "center" }
      };

      const styleLabel = {
          font: { bold: true, color: { rgb: "374151" } } // Gray-700
      };

      const styleInput = {
          font: { color: { rgb: "111827" } },
          alignment: { horizontal: "left" },
          border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } } }
      };

      const styleHeader = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
          alignment: { horizontal: "center", vertical: "center" },
          border: borderAll
      };

      const styleCellCenter = {
          border: borderAll,
          alignment: { horizontal: "center", vertical: "center" }
      };

      const styleCellLeft = {
          border: borderAll,
          alignment: { horizontal: "left", vertical: "center" },
          font: { bold: true, color: { rgb: "374151" } }
      };

      const styleCellWarning = {
          border: borderAll,
          alignment: { horizontal: "center", vertical: "center" },
          font: { color: { rgb: "B45309" } }, // Amber-700
          fill: { fgColor: { rgb: "FEF3C7" } } // Amber-100
      };

      const styleSummaryLabel = {
        font: { bold: true, color: { rgb: "374151" } },
        alignment: { horizontal: "right", vertical: "center" }
      };

      const styleSummaryValue = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderAll
      };

      const styleFinalValue = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "059669" } }, // Emerald-600
        alignment: { horizontal: "center", vertical: "center" },
        border: borderAll
      };

      // 1. Apply Title (A1)
      if(!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // Merge Title
      if(ws['A1']) ws['A1'].s = styleTitle;

      // 2. Apply Info Section
      if(ws['A3']) ws['A3'].s = styleLabel;
      if(ws['B3']) ws['B3'].s = styleInput;
      if(ws['A4']) ws['A4'].s = styleLabel;
      if(ws['B4']) ws['B4'].s = styleInput;

      // 3. Apply Header Style (Row 5 / Index 5)
      for(let C = 0; C <= 8; C++) {
          const cellRef = XLSX.utils.encode_cell({r: 5, c: C});
          if(!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };
          ws[cellRef].s = styleHeader;
      }

      // 4. Apply Data Styles (Row 6 to End of Data)
      const lastDataRowIndex = 5 + dataRows.length;
      
      for(let R = 6; R <= lastDataRowIndex; R++) {
          // Check for daily cap exceed
          let isOvertime = false;
          const totalRef = XLSX.utils.encode_cell({r: R, c: 7});
          if (ws[totalRef] && typeof ws[totalRef].v === 'number' && ws[totalRef].v > 8) {
              isOvertime = true;
          }

          for(let C = 0; C <= 8; C++) {
              const cellRef = XLSX.utils.encode_cell({r: R, c: C});
              if(!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };

              if (C === 0) {
                  ws[cellRef].s = styleCellLeft; 
              } else if (C === 8 && isOvertime) {
                  ws[cellRef].s = styleCellWarning;
              } else {
                  ws[cellRef].s = styleCellCenter;
              }
          }
      }

      // 5. Apply Summary Styles
      // The summary rows start after: Title(1) + Spacer(1) + Info(2) + Spacer(1) + Header(1) + Data(N) + Spacer(1)
      // Which corresponds to index: 1 + 1 + 2 + 1 + 1 + N + 1 = 7 + N.
      // Or simply: lastDataRowIndex + 2 (because of 1 spacer row).
      const startSummaryRow = lastDataRowIndex + 2;

      // Row: Total Actual
      const labelActual = XLSX.utils.encode_cell({r: startSummaryRow, c: 6});
      const valActual = XLSX.utils.encode_cell({r: startSummaryRow, c: 7});
      if(ws[labelActual]) ws[labelActual].s = styleSummaryLabel;
      if(ws[valActual]) ws[valActual].s = styleSummaryValue;

      // Row: Total Credited
      const labelCredited = XLSX.utils.encode_cell({r: startSummaryRow + 1, c: 6});
      const valCredited = XLSX.utils.encode_cell({r: startSummaryRow + 1, c: 7});
      if(ws[labelCredited]) ws[labelCredited].s = styleSummaryLabel;
      if(ws[valCredited]) ws[valCredited].s = styleSummaryValue;

      // Row: Final
      const labelFinal = XLSX.utils.encode_cell({r: startSummaryRow + 2, c: 6});
      const valFinal = XLSX.utils.encode_cell({r: startSummaryRow + 2, c: 7});
      if(ws[labelFinal]) ws[labelFinal].s = styleSummaryLabel;
      if(ws[valFinal]) ws[valFinal].s = styleFinalValue;


      // Column Widths
      ws['!cols'] = [
        { wch: 18 }, // Date
        { wch: 12 }, // Morning In
        { wch: 12 }, // Morning Out
        { wch: 12 }, // Afternoon In
        { wch: 12 }, // Afternoon Out
        { wch: 10 }, // AM Hours
        { wch: 10 }, // PM Hours
        { wch: 20 }, // Daily Total / Summary Labels
        { wch: 20 }  // Credited Hours / Summary Values
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

      // Save file
      const fileName = userInfo.name ? `${userInfo.name.replace(/\s+/g, '_')}_DTR.xlsx` : "Timesheet.xlsx";
      XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                 <h1 className="text-xl font-bold text-gray-900 tracking-tight">Smart DTR</h1>
                 <p className="text-xs text-gray-500">Weekly Attendance Record</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-red-600 px-3 py-2 transition-colors"
                >
                    Reset Week
                </button>
                <button 
                    onClick={exportToExcel}
                    className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Export Excel
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Employee Information Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Employee Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    value={userInfo.name}
                                    onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                                    className="block w-full rounded-md border border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Office / Department</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    value={userInfo.office}
                                    onChange={(e) => setUserInfo({...userInfo, office: e.target.value})}
                                    className="block w-full rounded-md border border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                                    placeholder="e.g. IT Department"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timesheet Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 className="text-base font-semibold text-gray-900">Time Entries</h2>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Week of {entries[0]?.date}</span>
                    </div>
                    <Timesheet 
                        entries={entries} 
                        onUpdateEntry={handleUpdateEntry} 
                        onClearEntry={handleClearEntry}
                    />
                </div>

                {/* Summary Section */}
                <Summary entries={entries} />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;