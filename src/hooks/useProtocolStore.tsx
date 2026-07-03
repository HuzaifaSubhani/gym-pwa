"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type SetLog = { weight: string; reps: string; drops?: { weight: string; reps: string }[] };

export type ProtocolState = {
  activeWeek: number;
  activeDayOfWeek: number;
  workoutLogs: Record<string, Record<string, SetLog[]>>; // { dateStr: { exerciseId: [SetLog] } }
  weightLogs: Record<number, string>; // { weekNumber: weightStr }
  habits: Record<string, { morning: boolean; evening: boolean }>; // { dateStr: { ... } }
};

type ProtocolContextType = {
  state: ProtocolState;
  setHabit: (dateStr: string, type: "morning" | "evening", value: boolean) => void;
  setWorkoutLog: (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => void;
  setFullExerciseLogs: (dateStr: string, exerciseId: string, logs: SetLog[]) => void;
  setWeightLog: (week: number, weight: string) => void;
  setActiveWeekDay: (week: number, day: number) => void;
};

const initialState: ProtocolState = {
  activeWeek: 1,
  activeDayOfWeek: 1,
  workoutLogs: {},
  weightLogs: {},
  habits: {},
};

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProtocolState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recomp_tracker_v1");
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse save", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("recomp_tracker_v1", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const setHabit = (dateStr: string, type: "morning" | "evening", value: boolean) => {
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
    setState((prev) => ({
      ...prev,
      activeWeek: week,
      activeDayOfWeek: day,
    }));
  };

  if (!isLoaded) return null;

  return (
    <ProtocolContext.Provider value={{ state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay }}>
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
