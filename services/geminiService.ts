import { GoogleGenAI, Type } from "@google/genai";
import { TimeEntry } from "../types";
import { generateId } from "../utils/timeUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseTimeEntry = async (prompt: string, referenceDate: string): Promise<Partial<TimeEntry>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Current reference date: ${referenceDate}.
        Parse the following user input into a list of daily time entries. 
        User Input: "${prompt}"
        
        Rules:
        1. Extract date (YYYY-MM-DD), morningIn (HH:mm, 24hr), morningOut (HH:mm, 24hr), afternoonIn (HH:mm, 24hr), afternoonOut (HH:mm, 24hr).
        2. If a specific date is not mentioned but day of week is (e.g., "Monday"), assume it is the Monday of the week containing the reference date.
        3. If no morning/afternoon split is clear, put the first block in morning.
        4. Infer missing AM/PM based on standard work hours (8-5) if ambiguous.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              morningIn: { type: Type.STRING, description: "HH:mm" },
              morningOut: { type: Type.STRING, description: "HH:mm" },
              afternoonIn: { type: Type.STRING, description: "HH:mm" },
              afternoonOut: { type: Type.STRING, description: "HH:mm" },
              notes: { type: Type.STRING, description: "Short summary of work if mentioned" }
            },
            required: ["date"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    // Add IDs to the parsed entries
    return parsed.map((p: any) => ({ ...p, id: generateId() }));

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to parse time entry.");
  }
};
