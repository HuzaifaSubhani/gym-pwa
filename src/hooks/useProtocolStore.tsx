"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProtocolDateInfo } from "@/data/protocol";

export type SetLog = { weight: string; reps: string; drops?: { weight: string; reps: string }[]; rating?: string; };

export type TrackedLift = { id: string; name: string; muscle: string; color: string };

export type ProtocolState = {
  activeWeek: number;
  activeDayOfWeek: number;
  workoutLogs: Record<string, Record<string, SetLog[]>>; // { dateStr: { exerciseId: [SetLog] } }
  weightLogs: Record<number, string>; // { weekNumber: weightStr }
  habits: Record<string, { morning: boolean; evening: boolean }>; // { dateStr: { ... } }
  customRoutine?: Record<number, any>; // { dayNum: DayRoutine }
  customDailyExercises?: Record<string, any[]>; // { dateStr: Exercise[] }
  timer: { isActive: boolean; endTime: number; isPaused: boolean; duration: number };
  trackedLifts: TrackedLift[];
};

type ProtocolContextType = {
  state: ProtocolState;
  setHabit: (dateStr: string, type: "morning" | "evening", value: boolean) => void;
  setWorkoutLog: (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => void;
  setFullExerciseLogs: (dateStr: string, exerciseId: string, logs: SetLog[]) => void;
  setWeightLog: (week: number, weight: string) => void;
  setActiveWeekDay: (week: number, day: number) => void;
  addCustomExercise: (exercise: any, scope: "today" | "every_week", dayNum: number, dateStr: string) => void;
  removeExercise: (dayNum: number, dateStr: string, exerciseId: string) => void;
  setCustomDayRoutine: (dayNum: number, name: string, focus: string) => void;
  syncWithUser: (userId: string) => void;
  updateTimer: (updates: Partial<ProtocolState["timer"]>) => void;
  startTimer: (seconds: number) => void;
  addTrackedLift: (lift: TrackedLift) => void;
  removeTrackedLift: (id: string) => void;
};

const { currentWeek, currentDayOfWeek } = getCurrentProtocolDateInfo();

const initialState: ProtocolState = {
  activeWeek: currentWeek,
  activeDayOfWeek: currentDayOfWeek,
  workoutLogs: {},
  weightLogs: {},
  habits: {},
  timer: { isActive: false, endTime: 0, isPaused: false, duration: 60 },
  trackedLifts: [
    { id: "m1", name: "Incline DB Press", muscle: "Upper Chest", color: "#39ff14" },
    { id: "t1", name: "Pull-ups / Pulldown", muscle: "Lats", color: "#00ffff" },
    { id: "w1", name: "Hack Squat", muscle: "Quads", color: "#ff00ff" },
    { id: "th1", name: "Smith Machine Press", muscle: "Shoulders", color: "#ffff00" },
    { id: "f1", name: "Split Squats", muscle: "Legs", color: "#ff3333" },
  ],
};

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProtocolState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`gym_pwa_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Always ensure the app starts on today's date when they open it, 
          // overriding whatever week/day was saved previously.
          const { currentWeek, currentDayOfWeek } = getCurrentProtocolDateInfo();
          setState({
            ...parsed,
            activeWeek: currentWeek,
            activeDayOfWeek: currentDayOfWeek,
          });
        } catch (e) {
          console.error("Failed to parse save", e);
        }
      }
      setIsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded && userId) {
      localStorage.setItem(`gym_pwa_${userId}`, JSON.stringify(state));
    }
  }, [state, isLoaded, userId]);

  const syncWithUser = useCallback(async (id: string) => {
    // Hard guard: only sync once per app lifecycle
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    
    setUserId(id);
    
    // Attempt to pull from Supabase to merge/override local
    const { data: logs } = await supabase.from("workout_logs").select("*").eq("user_id", id);
    if (logs && logs.length > 0) {
      setState(prev => {
        const mergedLogs = { ...prev.workoutLogs };
        logs.forEach(log => {
          if (!mergedLogs[log.date_str]) mergedLogs[log.date_str] = {};
          mergedLogs[log.date_str][log.exercise_id] = log.logs;
        });
        return { ...prev, workoutLogs: mergedLogs };
      });
    }
  }, []);

  const setHabit = useCallback((dateStr: string, type: "morning" | "evening", value: boolean) => {
    setState((prev) => ({
      ...prev,
      habits: {
        ...prev.habits,
        [dateStr]: {
          ...(prev.habits[dateStr] || { morning: false, evening: false }),
          [type]: value,
        },
      },
    }));
  }, []);

  const setWorkoutLog = useCallback((dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => {
    setState((prev) => {
      const dayLogs = prev.workoutLogs[dateStr] || {};
      const exLogs = [...(dayLogs[exerciseId] || [])];
      exLogs[setIndex] = log;

      return {
        ...prev,
        workoutLogs: {
          ...prev.workoutLogs,
          [dateStr]: {
            ...dayLogs,
            [exerciseId]: exLogs,
          },
        },
      };
    });
  }, []);

  const setFullExerciseLogs = useCallback((dateStr: string, exerciseId: string, logs: SetLog[]) => {
    setState((prev) => {
      const dayLogs = prev.workoutLogs[dateStr] || {};
      const newState = {
        ...prev,
        workoutLogs: {
          ...prev.workoutLogs,
          [dateStr]: {
            ...dayLogs,
            [exerciseId]: logs,
          },
        },
      };
      
      // Async sync to Supabase (fire and forget) using cached session to avoid redundant network calls
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from("workout_logs").upsert({
            user_id: session.user.id,
            date_str: dateStr,
            exercise_id: exerciseId,
            logs: logs
          }, { onConflict: "user_id, date_str, exercise_id" }).then(({ error }) => {
            if (error) console.error("Error syncing log to Supabase:", error);
          });
        }
      });
      
      return newState;
    });
  }, []);

  const setWeightLog = useCallback((week: number, weight: string) => {
    setState((prev) => ({
      ...prev,
      weightLogs: {
        ...prev.weightLogs,
        [week]: weight,
      },
    }));
  }, []);

  const setActiveWeekDay = useCallback((week: number, day: number) => {
    setState((prev) => ({
      ...prev,
      activeWeek: week,
      activeDayOfWeek: day,
    }));
  }, []);

  const addCustomExercise = useCallback((exercise: any, scope: "today" | "every_week", dayNum: number, dateStr: string) => {
    setState((prev) => {
      if (scope === "today") {
        const existing = prev.customDailyExercises?.[dateStr] || [];
        return {
          ...prev,
          customDailyExercises: {
            ...prev.customDailyExercises,
            [dateStr]: [...existing, exercise],
          },
        };
      } else {
        const existingRoutine = prev.customRoutine?.[dayNum];
        if (existingRoutine) {
          return {
            ...prev,
            customRoutine: {
              ...prev.customRoutine,
              [dayNum]: {
                ...existingRoutine,
                exercises: [...existingRoutine.exercises, exercise],
              },
            },
          };
        } else {
          // If the day hasn't been customized yet, we shouldn't overwrite the base schema directly here.
          // The component should pass the base routine so we can append to it.
          return {
            ...prev,
            customRoutine: {
              ...prev.customRoutine,
              [dayNum]: {
                exercises: [exercise],
                isPartial: true // Flag to indicate we need to merge with ROUTINE_SCHEMA
              }
            }
          }
        }
      }
    });
  }, []);

  const removeExercise = useCallback((dayNum: number, dateStr: string, exerciseId: string) => {
    setState((prev) => {
      const newCustomDaily = { ...prev.customDailyExercises };
      if (newCustomDaily[dateStr]) {
        newCustomDaily[dateStr] = newCustomDaily[dateStr].filter(ex => ex.id !== exerciseId);
      }

      const newCustomRoutine = { ...prev.customRoutine };
      return {
        ...prev,
        customDailyExercises: newCustomDaily,
        customRoutine: newCustomRoutine[dayNum] ? {
          ...newCustomRoutine,
          [dayNum]: {
            ...newCustomRoutine[dayNum],
            exercises: newCustomRoutine[dayNum].exercises.filter((ex: any) => ex.id !== exerciseId)
          }
        } : newCustomRoutine
      };
    });
  }, []);

  const setCustomDayRoutine = useCallback((dayNum: number, name: string, focus: string) => {
    setState((prev) => {
      const existing = prev.customRoutine?.[dayNum];
      return {
        ...prev,
        customRoutine: {
          ...prev.customRoutine,
          [dayNum]: {
            dayName: name,
            focus: focus,
            exercises: existing?.isPartial === false ? existing.exercises : [],
            isPartial: false // completely overrides base schema
          }
        }
      };
    });
  }, []);

  const updateTimer = useCallback((updates: Partial<ProtocolState["timer"]>) => {
    setState(prev => ({
      ...prev,
      timer: { ...prev.timer, ...updates }
    }));
  }, []);

  const startTimer = useCallback((seconds: number) => {
    setState(prev => ({
      ...prev,
      timer: {
        isActive: true,
        isPaused: false,
        duration: seconds,
        endTime: Date.now() + seconds * 1000
      }
    }));
  }, []);

  const addTrackedLift = useCallback((lift: TrackedLift) => {
    setState(prev => {
      // Ensure no duplicates
      if (prev.trackedLifts?.find(l => l.id === lift.id)) return prev;
      return {
        ...prev,
        trackedLifts: [...(prev.trackedLifts || []), lift]
      };
    });
  }, []);

  const removeTrackedLift = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      trackedLifts: (prev.trackedLifts || []).filter(l => l.id !== id)
    }));
  }, []);

  const contextValue = useMemo(() => ({
    state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay, addCustomExercise, removeExercise, setCustomDayRoutine, syncWithUser, updateTimer, startTimer, addTrackedLift, removeTrackedLift
  }), [state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay, addCustomExercise, removeExercise, setCustomDayRoutine, syncWithUser, updateTimer, startTimer, addTrackedLift, removeTrackedLift]);

  return (
    <ProtocolContext.Provider value={contextValue}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (context === undefined) {
    throw new Error("useProtocol must be used within a ProtocolProvider");
  }
  return context;
}
