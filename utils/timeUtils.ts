import { CalculatedHours, TimeEntry } from '../types';

/**
 * Converts a time string "HH:mm" to minutes since midnight.
 * Returns -1 if invalid or empty.
 */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return -1;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return -1;
  return hours * 60 + minutes;
};

/**
 * Calculates the difference in hours between two time strings.
 * Returns 0 if invalid or if out < in.
 */
export const calculateDuration = (start: string, end: string): number => {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (startMin === -1 || endMin === -1) return 0;
  if (endMin < startMin) return 0; // Invalid duration (negative)

  const diffMinutes = endMin - startMin;
  return Math.round((diffMinutes / 60) * 100) / 100; // Round to 2 decimal places
};

/**
 * Validates and calculates hours for a single entry.
 */
export const calculateDailyHours = (entry: TimeEntry): CalculatedHours => {
  const errors: string[] = [];
  
  // Validate Morning
  const amIn = timeToMinutes(entry.morningIn);
  const amOut = timeToMinutes(entry.morningOut);
  let morningHours = 0;

  if (entry.morningIn && entry.morningOut) {
    if (amOut < amIn) {
      errors.push("Morning Out cannot be before Morning In");
    } else {
      morningHours = calculateDuration(entry.morningIn, entry.morningOut);
    }
  }

  // Validate Afternoon
  const pmIn = timeToMinutes(entry.afternoonIn);
  const pmOut = timeToMinutes(entry.afternoonOut);
  let afternoonHours = 0;

  if (entry.afternoonIn && entry.afternoonOut) {
    if (pmOut < pmIn) {
      errors.push("Afternoon Out cannot be before Afternoon In");
    } else {
      afternoonHours = calculateDuration(entry.afternoonIn, entry.afternoonOut);
    }
  }

  // Cross-session validation (Afternoon In should be after Morning Out)
  if (entry.morningOut && entry.afternoonIn) {
     if (pmIn < amOut) {
         errors.push("Afternoon In overlaps with Morning Out");
     }
  }

  const dailyTotalActual = morningHours + afternoonHours;
  // Cap daily hours at 8
  const dailyTotalCredited = Math.min(dailyTotalActual, 8);

  return {
    morningHours,
    afternoonHours,
    dailyTotalActual,
    dailyTotalCredited,
    isValid: errors.length === 0,
    errors
  };
};

export const formatDecimalHours = (hours: number): string => {
  return hours > 0 ? hours.toFixed(2) : '-';
};

export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15);
}

export const getWeekDays = (startDate: Date): TimeEntry[] => {
    const entries: TimeEntry[] = [];
    const current = new Date(startDate);
    
    // Adjust to Monday
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    // Only generate 5 days (Mon-Fri)
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        entries.push({
            id: generateId(),
            date: d.toISOString().split('T')[0],
            morningIn: '',
            morningOut: '',
            afternoonIn: '',
            afternoonOut: '',
            notes: ''
        });
    }
    return entries;
};