export interface TimeEntry {
  id: string;
  date: string;
  morningIn: string; // "HH:mm"
  morningOut: string; // "HH:mm"
  afternoonIn: string; // "HH:mm"
  afternoonOut: string; // "HH:mm"
  notes?: string;
}

export interface CalculatedHours {
  morningHours: number;
  afternoonHours: number;
  dailyTotalActual: number;
  dailyTotalCredited: number; // Capped at 8
  isValid: boolean;
  errors: string[];
}

export enum GeminiStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}