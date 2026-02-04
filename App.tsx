import React, { useState, useEffect } from 'react';
import Timesheet from './components/Timesheet';
import Summary from './components/Summary';
import SmartEntry from './components/SmartEntry';
import { TimeEntry } from './types';
import { getWeekDays, calculateDailyHours } from './utils/timeUtils';
import { CalendarDaysIcon, DocumentArrowDownIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import XLSX from 'xlsx';

const App: React.FC = () => {
  // Initialize with current week
  const [entries, setEntries] = useState<TimeEntry[]>(() => getWeekDays(new Date()));
  const [userInfo, setUserInfo] = useState({ name: '', office: '' });
  const [isNewWeek, setIsNewWeek] = useState(false);

  // Auto-save/load entries
  useEffect(() => {
    const saved = localStorage.getItem('dtr-entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
           // Check if the saved data belongs to the current week
           const currentWeekData = getWeekDays(new Date());
           const currentWeekStart = currentWeekData[0].date;
           const savedWeekStart = parsed[0].date;

           if (currentWeekStart === savedWeekStart) {
             setEntries(parsed);
           } else {
             // Logic for new week: 
             // We do NOT load the old entries, effectively starting fresh.
             setIsNewWeek(true);
           }
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
    // Clear the "New Week" notification if user starts editing
    if (isNewWeek) setIsNewWeek(false);
  };

  const handleClearEntry = (id: string) => {
      setEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, morningIn: '', morningOut: '', afternoonIn: '', afternoonOut: '', notes: '' } : entry
      ));
  };

  const handleSmartFill = (parsedEntries: Partial<TimeEntry>[]) => {
    setEntries(prevEntries => {
        const newEntries = [...prevEntries];
        parsedEntries.forEach(parsed => {
            if (parsed.date) {
                const idx = newEntries.findIndex(e => e.date === parsed.date);
                if (idx >= 0) {
                    // Update existing entry while preserving ID
                    newEntries[idx] = { 
                        ...newEntries[idx], 
                        ...parsed, 
                        id: newEntries[idx].id 
                    };
                }
            }
        });
        return newEntries;
    });
    if (isNewWeek) setIsNewWeek(false);
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all entries for this week?")) {
        // Force generate new days for the current week
        const freshEntries = getWeekDays(new Date());
        setEntries(freshEntries);
        setIsNewWeek(false);
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
        "AM Hours", "PM Hours", "Total Hours", "Credited (Max 8)", "Notes"
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
          stats.dailyTotalCredited || 0,
          e.notes || ""
        ];
      });

      const finalWeeklyCredited = Math.min(totalCreditedSum, 40);

      // Summary Rows
      const summaryHeaderRow = ["", "", "", "", "", "", "WEEKLY SUMMARY", "", "", ""];
      const summaryActualRow = ["", "", "", "", "", "", "Total Actual:", totalActual.toFixed(2), "", ""];
      const summaryCreditedRow = ["", "", "", "", "", "", "Total Credited:", totalCreditedSum.toFixed(2), "", ""];
      const summaryFinalRow = ["", "", "", "", "", "", "FINAL (Max 40h):", finalWeeklyCredited.toFixed(2), "", ""];

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
      const borderAll = {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
      };

      const fontBase = { name: "Arial", sz: 12, color: { rgb: "1F2937" } };
      const fontBold = { name: "Arial", sz: 12, bold: true, color: { rgb: "111827" } };
      const fontHeader = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
      const fontTitle = { name: "Arial", sz: 24, bold: true, color: { rgb: "4338CA" } };
      const fontInfoLabel = { name: "Arial", sz: 14, bold: true, color: { rgb: "374151" } };
      const fontInfoValue = { name: "Arial", sz: 14, color: { rgb: "111827" } };
      const fontWarning = { name: "Arial", sz: 12, bold: true, color: { rgb: "92400E" } };

      const fillHeader = { fgColor: { rgb: "4F46E5" } }; // Indigo-600
      const fillOdd = { fgColor: { rgb: "F9FAFB" } }; // Gray-50
      const fillEven = { fgColor: { rgb: "FFFFFF" } }; // White
      const fillWarning = { fgColor: { rgb: "FEF3C7" } }; // Amber-100
      const fillTitle = { fgColor: { rgb: "EEF2FF" } }; // Indigo-50
      const fillFinal = { fgColor: { rgb: "059669" } }; // Emerald-600

      // Styles
      const styleTitle = { font: fontTitle, alignment: { horizontal: "center", vertical: "center" }, fill: fillTitle };
      const styleHeader = { font: fontHeader, fill: fillHeader, alignment: { horizontal: "center", vertical: "center" }, border: borderAll };
      const styleInfoLabel = { font: fontInfoLabel, alignment: { horizontal: "left", vertical: "center" } };
      const styleInfoValue = { font: fontInfoValue, alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } } } };

      const styleSummaryLabel = { font: fontInfoLabel, alignment: { horizontal: "right", vertical: "center" } };
      const styleSummaryValue = { font: { ...fontBold, sz: 14 }, alignment: { horizontal: "center", vertical: "center" }, border: borderAll };
      const styleFinalValue = { font: { ...fontBold, sz: 14, color: { rgb: "FFFFFF" } }, fill: fillFinal, alignment: { horizontal: "center", vertical: "center" }, border: borderAll };

      // Helper for data rows
      const getDataStyle = (align: string, isBold: boolean, isOdd: boolean, isWarning: boolean) => ({
          font: isWarning ? fontWarning : (isBold ? fontBold : fontBase),
          fill: isWarning ? fillWarning : (isOdd ? fillOdd : fillEven),
          alignment: { horizontal: align, vertical: "center" },
          border: borderAll
      });

      // 1. Apply Title
      if(!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }); // Merged to column 9 (J)
      if(ws['A1']) ws['A1'].s = styleTitle;

      // 2. Apply Info Section
      if(ws['A3']) ws['A3'].s = styleInfoLabel;
      if(ws['B3']) ws['B3'].s = styleInfoValue;
      if(ws['A4']) ws['A4'].s = styleInfoLabel;
      if(ws['B4']) ws['B4'].s = styleInfoValue;

      // 3. Apply Header Style
      for(let C = 0; C <= 9; C++) {
          const cellRef = XLSX.utils.encode_cell({r: 5, c: C});
          if(!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };
          ws[cellRef].s = styleHeader;
      }

      // 4. Apply Data Styles with Alternating Colors
      const lastDataRowIndex = 5 + dataRows.length;
      
      for(let R = 6; R <= lastDataRowIndex; R++) {
          const rowIndex = R - 6;
          const isOdd = rowIndex % 2 !== 0;
          
          let isOvertime = false;
          const totalRef = XLSX.utils.encode_cell({r: R, c: 7});
          if (ws[totalRef] && typeof ws[totalRef].v === 'number' && ws[totalRef].v > 8) {
              isOvertime = true;
          }

          for(let C = 0; C <= 9; C++) {
              const cellRef = XLSX.utils.encode_cell({r: R, c: C});
              if(!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };

              if (C === 0) {
                  // Date
                  ws[cellRef].s = getDataStyle("left", true, isOdd, false);
              } else if (C === 7) {
                  // Total Hours (Bold)
                  ws[cellRef].s = getDataStyle("center", true, isOdd, false); // Bold total actual
              } else if (C === 8 && isOvertime) {
                  // Credited Hours Warning
                  ws[cellRef].s = getDataStyle("center", true, isOdd, true);
              } else if (C === 9) {
                  // Notes
                  ws[cellRef].s = getDataStyle("left", false, isOdd, false);
              } else {
                  // Normal Times
                  ws[cellRef].s = getDataStyle("center", false, isOdd, false);
              }
          }
      }

      // 5. Apply Summary Styles
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

      // Row Heights (hpt)
      ws['!rows'] = [
          { hpt: 45 }, // Title
          { hpt: 15 }, // Spacer
          { hpt: 25 }, // Name
          { hpt: 25 }, // Office
          { hpt: 15 }, // Spacer
          { hpt: 30 }, // Header
      ];
      // Add dynamic row heights for data
      for (let i = 0; i < dataRows.length; i++) {
        ws['!rows'].push({ hpt: 25 });
      }
      // Add spacer and summary row heights
      ws['!rows'].push({ hpt: 20 }); // Spacer
      ws['!rows'].push({ hpt: 15 }); // Spacer
      ws['!rows'].push({ hpt: 30 }); // Summary 1
      ws['!rows'].push({ hpt: 30 }); // Summary 2
      ws['!rows'].push({ hpt: 30 }); // Summary 3

      // Column Widths
      ws['!cols'] = [
        { wch: 22 }, // Date
        { wch: 14 }, // AM In
        { wch: 14 }, // AM Out
        { wch: 14 }, // PM In
        { wch: 14 }, // PM Out
        { wch: 12 }, // AM Hrs
        { wch: 12 }, // PM Hrs
        { wch: 15 }, // Total
        { wch: 18 }, // Credited
        { wch: 40 }  // Notes
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

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
                {isNewWeek && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium animate-pulse">
                     New Week Started
                  </span>
                )}
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

                <SmartEntry 
                  currentDate={entries[0]?.date || new Date().toISOString().split('T')[0]} 
                  onEntriesParsed={handleSmartFill} 
                />

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