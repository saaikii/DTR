import React, { useState, useEffect, useRef } from 'react';
import Timesheet from './components/Timesheet';
import Summary from './components/Summary';
import SmartEntry from './components/SmartEntry';
import { TimeEntry } from './types';
import { generateMonthEntries, calculateDailyHours } from './utils/timeUtils';
import { 
  CalendarDaysIcon, 
} from '@heroicons/react/24/outline';
import XLSX from 'xlsx';

const App: React.FC = () => {
  // Initialize starting specifically from January 19 of the current year
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    const start = new Date();
    start.setMonth(0); // January
    start.setDate(19);
    return generateMonthEntries(start);
  });
  const [userInfo, setUserInfo] = useState({ name: '', office: '' });
  const [targetHours, setTargetHours] = useState(486); // Default from image
  const [isNewWeek, setIsNewWeek] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Load target hours
    const savedTarget = localStorage.getItem('dtr-target-hours');
    if (savedTarget) setTargetHours(Number(savedTarget));
    
    setIsInitialized(true);
  }, []);

  // Save entries ONLY after initialization is complete
  useEffect(() => {
    if (isInitialized) {
        localStorage.setItem('dtr-entries', JSON.stringify(entries));
        localStorage.setItem('dtr-target-hours', String(targetHours));
    }
  }, [entries, targetHours, isInitialized]);

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
    if(window.confirm("Are you sure you want to reset all entries? This will start a new schedule from January 19.")) {
        const start = new Date();
        start.setMonth(0); // January
        start.setDate(19);
        const freshEntries = generateMonthEntries(start);
        setEntries(freshEntries);
        setIsNewWeek(false);
    }
  };

  // --- Backup / Restore Functions ---

  const saveBackup = () => {
    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      userInfo,
      targetHours,
      entries
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DTR_Backup_${userInfo.name ? userInfo.name.replace(/\s+/g, '_') : 'My'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadBackup = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.entries && Array.isArray(parsed.entries)) {
             setEntries(parsed.entries);
        }
        if (parsed.userInfo) setUserInfo(parsed.userInfo);
        if (parsed.targetHours) setTargetHours(parsed.targetHours);

        alert("Backup loaded successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to load backup file. Invalid format.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportToExcel = () => {
      const wb = XLSX.utils.book_new();
      
      // -- STYLES --
      const borderStyle = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      const titleStyle = {
          font: { bold: true, sz: 20, name: "Arial" }, // Increased size
          alignment: { horizontal: "center", vertical: "center" }
      };

      const labelStyle = {
          font: { bold: true, sz: 14, name: "Arial" }, // Increased size
          alignment: { horizontal: "left", vertical: "center" }
      };
      
      const valueStyle = {
          font: { sz: 14, name: "Arial", underline: true }, // Increased size
          alignment: { horizontal: "left", vertical: "center" }
      };

      const headerStyle = {
        font: { bold: true, sz: 12, name: "Arial" }, // Increased size
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: borderStyle,
        fill: { fgColor: { rgb: "FFFFFF" } } 
      };

      const dataStyle = {
        font: { sz: 12, name: "Arial" }, // Increased size
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle,
        fill: { fgColor: { rgb: "FFFFFF" } }
      };
      
      const boldDataStyle = {
         ...dataStyle,
         font: { sz: 12, name: "Arial", bold: true } // Increased size
      };

      // Colors approx matching Tailwind classes
      const weekColors = ["FFF7ED", "FFFBEB", "FFF1F2", "EFF6FF"];

      // -- DATA CONSTRUCTION --
      
      // Header Info Rows
      const wsData: any[][] = [
          [{ v: "DAILY TIME RECORD", s: titleStyle }],
          [], // Spacer
          [
              { v: "Employee:", s: labelStyle }, 
              { v: userInfo.name, s: valueStyle },
              null,
              { v: "Office:", s: labelStyle },
              { v: userInfo.office, s: valueStyle }
          ],
          [
              { v: "Target Hours:", s: labelStyle },
              { v: targetHours, s: { ...valueStyle, alignment: { horizontal: "left" } } } // Override alignment
          ],
          [] // Spacer
      ];

      // Table Header Rows (Row 5 & 6)
      const headerRow1 = [
          { v: "WEEK", s: headerStyle },
          { v: "DATE", s: headerStyle },
          { v: "AM", s: headerStyle },
          { v: "", s: headerStyle }, // Merged
          { v: "PM", s: headerStyle },
          { v: "", s: headerStyle }, // Merged
          { v: "DAILY HRS", s: headerStyle },
          { v: "WEEKLY HRS", s: headerStyle },
          { v: "REMAINING", s: headerStyle }
      ];

      const headerRow2 = [
          { v: "", s: headerStyle }, // Merged
          { v: "", s: headerStyle }, // Merged
          { v: "IN", s: headerStyle },
          { v: "OUT", s: headerStyle },
          { v: "IN", s: headerStyle },
          { v: "OUT", s: headerStyle },
          { v: "", s: headerStyle }, // Merged
          { v: "", s: headerStyle }, // Merged
          { v: "", s: headerStyle }  // Merged
      ];

      wsData.push(headerRow1, headerRow2);

      // Merges
      const merges = [
          // Title
          { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
          // Headers
          { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // Week
          { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }, // Date
          { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } }, // AM
          { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } }, // PM
          { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } }, // Daily
          { s: { r: 5, c: 7 }, e: { r: 6, c: 7 } }, // Weekly
          { s: { r: 5, c: 8 }, e: { r: 6, c: 8 } }, // Remaining
      ];

      // Data Rows logic
      let currentRemaining = targetHours;
      const dataStartRow = 7;
      let currentRow = dataStartRow;

      for (let i = 0; i < entries.length; i += 5) {
          const weekEntries = entries.slice(i, i + 5);
          const weekIndex = Math.floor(i / 5);
          const color = weekColors[weekIndex % weekColors.length];
          
          // Style for this week
          const weekCellStyle = {
              ...dataStyle,
              fill: { fgColor: { rgb: color } }
          };
          const weekBoldCellStyle = {
              ...boldDataStyle,
              fill: { fgColor: { rgb: color } }
          };

          // Calculate stats first to get weekly total
          let weekTotal = 0;
          weekEntries.forEach(e => {
             const s = calculateDailyHours(e);
             weekTotal += s.dailyTotalCredited;
          });

          // Add merge for "Week" and "Weekly Total" columns
          merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 4, c: 0 } });
          merges.push({ s: { r: currentRow, c: 7 }, e: { r: currentRow + 4, c: 7 } });

          weekEntries.forEach((e, idx) => {
              const stats = calculateDailyHours(e);
              currentRemaining -= stats.dailyTotalCredited;

              const row = [
                  // Col 0: Week (Only first row has value, others merged but style applied)
                  { v: idx === 0 ? `WEEK ${weekIndex + 1}` : "", s: weekBoldCellStyle },
                  // Col 1: Date
                  { v: e.date, s: { ...weekCellStyle, font: { ...weekCellStyle.font, bold: true } } },
                  // Col 2-5: Times
                  { v: e.morningIn, s: { ...dataStyle, fill: { fgColor: { rgb: "FFFFFF" } } } },
                  { v: e.morningOut, s: { ...dataStyle, fill: { fgColor: { rgb: "FFFFFF" } } } },
                  { v: e.afternoonIn, s: { ...dataStyle, fill: { fgColor: { rgb: "FFFFFF" } } } },
                  { v: e.afternoonOut, s: { ...dataStyle, fill: { fgColor: { rgb: "FFFFFF" } } } },
                  // Col 6: Daily Total
                  { v: stats.dailyTotalCredited > 0 ? stats.dailyTotalCredited.toFixed(2) : "", s: weekBoldCellStyle },
                  // Col 7: Weekly Total (Only first row has value)
                  { v: idx === 0 ? weekTotal.toFixed(2) : "", s: weekBoldCellStyle },
                  // Col 8: Remaining
                  { v: currentRemaining.toFixed(2), s: { ...boldDataStyle, fill: { fgColor: { rgb: "FFFFFF" } } } },
              ];
              wsData.push(row);
          });
          currentRow += 5;
      }
      
      // Footer Total
      const finalTotal = entries.reduce((acc, curr) => acc + calculateDailyHours(curr).dailyTotalCredited, 0);
      const totalRowIndex = currentRow;
      
      const footerLabelStyle = {
          font: { bold: true, sz: 14, name: "Arial" }, // Increased size
          alignment: { horizontal: "right", vertical: "center" },
          border: borderStyle,
          fill: { fgColor: { rgb: "FFFFFF" } }
      };
      
      const footerValueStyle = {
          font: { bold: true, sz: 16, name: "Arial" }, // Increased size
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle,
          fill: { fgColor: { rgb: "FFFFFF" } }
      };

      const totalRow = [
          { v: "TOTAL NO. OF HOURS", s: footerLabelStyle },
          { v: "", s: footerLabelStyle },
          { v: "", s: footerLabelStyle },
          { v: "", s: footerLabelStyle },
          { v: "", s: footerLabelStyle },
          { v: "", s: footerLabelStyle },
          { v: "", s: footerLabelStyle }, // Merged up to here
          { v: finalTotal.toFixed(2), s: footerValueStyle },
          { v: "", s: dataStyle }
      ];
      wsData.push(totalRow);
      merges.push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 6 } });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = merges;
      
      // Column Widths - Increased widths
      ws['!cols'] = [
          { wch: 15 }, // Week
          { wch: 20 }, // Date
          { wch: 12 }, // AM In
          { wch: 12 }, // AM Out
          { wch: 12 }, // PM In
          { wch: 12 }, // PM Out
          { wch: 15 }, // Daily
          { wch: 15 }, // Weekly
          { wch: 15 }, // Remaining
      ];

      XLSX.utils.book_append_sheet(wb, ws, "DTR");
      XLSX.writeFile(wb, `DTR_${userInfo.name ? userInfo.name.replace(/\s+/g, '_') : 'Export'}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* Header */}
      <header className="bg-indigo-900 text-white border-b border-gray-200 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
              <div>
                 <h1 className="text-xl font-bold tracking-tight">Smart Excel DTR</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleReset} className="text-sm text-gray-300 hover:text-white px-3 py-2 transition-colors">
                    Reset
                </button>
                <div className="h-4 w-px bg-gray-600 mx-1 hidden sm:block"></div>
                <button onClick={saveBackup} className="text-sm text-gray-300 hover:text-white px-3 py-2" title="Save Backup">
                    Backup
                </button>
                <button onClick={loadBackup} className="text-sm text-gray-300 hover:text-white px-3 py-2" title="Load Backup">
                    Restore
                </button>
                <div className="h-4 w-px bg-gray-600 mx-1 hidden sm:block"></div>
                <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors shadow-sm">
                    Export Excel
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            
            {/* Controls */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee Name</label>
                    <input
                        type="text"
                        value={userInfo.name}
                        onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Name"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Office</label>
                    <input
                        type="text"
                        value={userInfo.office}
                        onChange={(e) => setUserInfo({...userInfo, office: e.target.value})}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Department"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Hours (Total)</label>
                    <input
                        type="number"
                        value={targetHours}
                        onChange={(e) => setTargetHours(Number(e.target.value))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            <SmartEntry 
              currentDate={entries[0]?.date || new Date().toISOString().split('T')[0]} 
              onEntriesParsed={handleSmartFill} 
            />

            {/* Timesheet Table */}
            <Timesheet 
                entries={entries} 
                targetHours={targetHours}
                onUpdateEntry={handleUpdateEntry} 
                onClearEntry={handleClearEntry}
            />
        </div>
      </main>
    </div>
  );
};

export default App;