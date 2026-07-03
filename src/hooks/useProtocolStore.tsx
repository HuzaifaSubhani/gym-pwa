"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type SetLog = { weight: string; reps: string; drops?: { weight: string; reps: string }[] };

export type ProtocolState = {
  activeWeek: number;
  activeDayOfWeek: number;
  habitLogs: Record<string, { morning: boolean; evening: boolean }>; // key: YYYY-MM-DD
  workoutLogs: Record<string, Record<string, SetLog[]>>; // key: YYYY-MM-DD -> exerciseId -> sets
  weightLogs: Record<number, string>; // key: weekNumber -> weight
};

type ProtocolContextType = {
  state: ProtocolState;
  setHabit: (dateStr: string, type: "morning" | "evening", value: boolean) => void;
  setWorkoutLog: (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => void;
  setFullExerciseLogs: (dateStr: string, exerciseId: string, logs: SetLog[]) => void;
  setWeightLog: (week: number, weight: string) => void;
  setActiveWeekDay: (week: number, day: number) => void;
};

const defaultState: ProtocolState = {
  activeWeek: 1,
  activeDayOfWeek: 1, // Monday
  habitLogs: {},
  workoutLogs: {},
  weightLogs: {},
};

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

const STORAGE_KEY = "recomp_tracker_v1";

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProtocolState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to load local storage", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const setHabit = (dateStr: string, type: "morning" | "evening", value: boolean) => {
    setState((prev) => ({
      ...prev,
      habitLogs: {
        ...prev.habitLogs,
        [dateStr]: {
          ...(prev.habitLogs[dateStr] || { morning: false, evening: false }),
          [type]: value,
        },
      },
    }));
  };

  const setWorkoutLog = (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => {
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
  };

  const setFullExerciseLogs = (dateStr: string, exerciseId: string, logs: SetLog[]) => {
    setState((prev) => {
      const dayLogs = prev.workoutLogs[dateStr] || {};
      return {
        ...prev,
        workoutLogs: {
          ...prev.workoutLogs,
          [dateStr]: {
            ...dayLogs,
            [exerciseId]: logs,
          },
        },
      };
    });
  };

  const setWeightLog = (week: number, weight: string) => {
    setState((prev) => ({
      ...prev,
      weightLogs: {
        ...prev.weightLogs,
        [week]: weight,
      },
    }));
  };

  const setActiveWeekDay = (week: number, day: number) => {
    setState((prev) => ({ ...prev, activeWeek: week, activeDayOfWeek: day }));
  };

  if (!isLoaded) return null; // Avoid hydration mismatch

  return (
    <ProtocolContext.Provider value={{ state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay }}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (!context) {
    throw new Error("useProtocol must be used within ProtocolProvider");
  }
  return context;
}
