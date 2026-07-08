export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number; // in seconds
  notes?: string;
  isSpecialization?: boolean;
  gif_url?: string;
};

export type DayRoutine = {
  dayName: string;
  focus: string;
  exercises: Exercise[];
};

export const PROTOCOL_START_DATE = new Date(2026, 6, 6); // Year, Month (0-indexed, 6=July), Day
export const PROTOCOL_WEEKS = 7;

export const ROUTINE_SCHEMA: Record<number, DayRoutine> = {
  1: {
    dayName: "Monday",
    focus: "Push Day - Upper Chest Focus",
    exercises: [
      { id: "m1", name: "Incline Dumbbell Press", sets: 4, reps: "8-10", rest: 90, notes: "Progressive Overload Driver", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-r8WwZpL.gif" },
      { id: "m2", name: "Machine Chest Press", sets: 3, reps: "8-10", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0582-tOq3KXL.gif" },
      { id: "m3", name: "DB Lateral Raises", sets: 3, reps: "12-15", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-0QyV3vM.gif" },
      { id: "m4", name: "Tricep Rope Pushdowns", sets: 3, reps: "10-12", rest: 60, notes: "Final Set Drop Set", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0189-ZkCqV7X.gif" },
    ],
  },
  2: {
    dayName: "Tuesday",
    focus: "Pull Day - V-Taper Width",
    exercises: [
      { id: "t1", name: "Lat Pulldown or Pull-ups", sets: 4, reps: "8-10", rest: 90, notes: "Progressive Overload Driver", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0150-Z8kYg7g.gif" },
      { id: "t2", name: "Chest-Supported DB Row", sets: 3, reps: "8-10", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0300-h2m13n3.gif" },
      { id: "t3", name: "Cable Face Pulls", sets: 3, reps: "12-15", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0171-tWz23Xn.gif" },
      { id: "t4", name: "DB Hammer Curls", sets: 3, reps: "10-12", rest: 60, notes: "Final Set Drop Set", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0313-8vP5xQ5.gif" },
    ],
  },
  3: {
    dayName: "Wednesday",
    focus: "Leg Day - Metabolic Drive + Core",
    exercises: [
      { id: "w1", name: "Hack Squat or Leg Press", sets: 4, reps: "8-10", rest: 90, notes: "Progressive Overload Driver", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0468-b8t33Mv.gif" },
      { id: "w2", name: "Romanian Deadlifts", sets: 3, reps: "8-10", rest: 90, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0383-v0ZcZk5.gif" },
      { id: "w3", name: "Leg Extensions", sets: 3, reps: "12-15", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-LqBqJ8q.gif" },
      { id: "w4", name: "Weighted Hanging Leg Raises", sets: 3, reps: "12-15", rest: 60, isSpecialization: true, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0474-x8J57vM.gif" },
    ],
  },
  4: {
    dayName: "Thursday",
    focus: "Upper Aesthetics - Shoulders & Collarbone",
    exercises: [
      { id: "th1", name: "Incline Smith Machine Press", sets: 4, reps: "8-10", rest: 90, notes: "Upper Chest Target", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0754-5XQxM5k.gif" },
      { id: "th2", name: "Seated Cable Row - Wide Grip", sets: 3, reps: "8-10", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0199-B7c1kXn.gif" },
      { id: "th3", name: "DB Shoulder Press", sets: 3, reps: "8-10", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0386-XmB94mR.gif" },
      { id: "th4", name: "Cable Lateral Raises", sets: 3, reps: "12-15", rest: 60, notes: "Final Set Drop Set", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0161-5B3c8Wk.gif" },
    ],
  },
  5: {
    dayName: "Friday",
    focus: "Lower Aesthetics + Core",
    exercises: [
      { id: "f1", name: "Bulgarian Split Squats", sets: 4, reps: "8-10", rest: 90, notes: "per leg", gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0303-1nF4p9V.gif" },
      { id: "f2", name: "Lying Leg Curls", sets: 3, reps: "10-12", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0583-0J5H7xG.gif" },
      { id: "f3", name: "Dumbbell Shrugs", sets: 3, reps: "10-12", rest: 60, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0393-c9QxQvM.gif" },
      { id: "f4", name: "Weighted Hanging Leg Raises", sets: 3, reps: "12-15", rest: 60, isSpecialization: true, gif_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0474-x8J57vM.gif" },
    ],
  },
};

export function getIntensityDirectives(week: number, day: number, isIsolation: boolean, isFinal: boolean): { note: string; restMod?: number } {
  if (week >= 1 && week <= 3) {
    return { note: "" }; // Removed standard overload spam
  }
  
  if (week >= 4 && week <= 5) {
    if (day === 1 && isFinal) {
      return { note: "⚠️ Rest-Pause Set" };
    }
    if (day === 2) {
      return { note: "⚠️ 4-second Eccentric" };
    }
    return { note: "" };
  }
  
  if (week >= 6 && week <= 7) {
    let note = "";
    let restMod = 0;
    
    if (isIsolation) {
      restMod = -15; // Reduce isolation rest by 15s to make it 45s if originally 60s
    }
    if (isFinal) {
      note = "🔥 Brutal Double Drop Set";
    }
    return { note, restMod };
  }
  
  return { note: "" };
}

export function getCurrentProtocolDateInfo() {
  const now = new Date();
  const start = PROTOCOL_START_DATE;
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let currentWeek = Math.floor(diffDays / 7) + 1;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 7) currentWeek = 7;
  
  const jsDay = now.getDay(); // 0 is Sunday, 1 is Monday
  const currentDayOfWeek = jsDay === 0 ? 7 : jsDay; // 1 to 7
  
  return { currentWeek, currentDayOfWeek };
}
