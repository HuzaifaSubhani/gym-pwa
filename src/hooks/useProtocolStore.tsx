"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";

export type SetLog = { weight: string; reps: string; drops?: { weight: string; reps: string }[] };

export type ProtocolState = {
  syncId: string | null;
  activeWeek: number;
  activeDayOfWeek: number;
  workoutLogs: Record<string, Record<string, SetLog[]>>; // { dateStr: { exerciseId: [SetLog] } }
  weightLogs: Record<number, string>; // { weekNumber: weightStr }
  habits: Record<string, { morning: boolean; evening: boolean }>; // { dateStr: { ... } }
};

type ProtocolContextType = {
  state: ProtocolState;
  setSyncId: (id: string) => Promise<void>;
  setHabit: (dateStr: string, type: "morning" | "evening", value: boolean) => void;
  setWorkoutLog: (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => void;
  setFullExerciseLogs: (dateStr: string, exerciseId: string, logs: SetLog[]) => void;
  setWeightLog: (week: number, weight: string) => void;
  setActiveWeekDay: (week: number, day: number) => void;
};

const initialState: ProtocolState = {
  syncId: null,
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
  
  // Track if we are currently syncing to prevent infinite loops
  const isSyncing = useRef(false);

  // Auto-push helper
  const pushToCloud = async (newState: ProtocolState) => {
    if (!newState.syncId) return;
    try {
      await fetch(`/api/sync?id=${newState.syncId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState)
      });
    } catch (e) {
      console.error("Failed to push to cloud", e);
    }
  };

  // Initial load and pull
  useEffect(() => {
    const initialize = async () => {
      const saved = localStorage.getItem("recomp_tracker_v1");
      let localState: ProtocolState = saved ? JSON.parse(saved) : initialState;
      
      // If we have a syncId, pull the latest from cloud
      if (localState.syncId) {
        try {
          const res = await fetch(`/api/sync?id=${localState.syncId}`);
          if (res.ok) {
            const cloudState = await res.json();
            // Cloud takes priority
            localState = { ...initialState, ...cloudState };
            localStorage.setItem("recomp_tracker_v1", JSON.stringify(localState));
          }
        } catch (e) {
          console.error("Failed to pull from cloud", e);
        }
      } else {
        // First ever load on this device, let's create a sync ID automatically!
        try {
          const res = await fetch(`/api/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localState)
          });
          if (res.ok) {
            const { id } = await res.json();
            localState.syncId = id;
            localStorage.setItem("recomp_tracker_v1", JSON.stringify(localState));
          }
        } catch (e) {
          console.error("Failed to generate initial sync id", e);
        }
      }
      
      setState(localState);
      setIsLoaded(true);
    };

    initialize();
  }, []);

  // Sync to local storage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("recomp_tracker_v1", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Wrapper for setState that also pushes to cloud
  const setAndPush = (updater: (prev: ProtocolState) => ProtocolState) => {
    setState((prev) => {
      const next = updater(prev);
      pushToCloud(next);
      return next;
    });
  };

  const setSyncId = async (id: string) => {
    try {
      const res = await fetch(`/api/sync?id=${id}`);
      if (res.ok) {
        const cloudState = await res.json();
        // Overwrite local state with cloud state, keeping the new syncId
        cloudState.syncId = id;
        setState(cloudState);
        localStorage.setItem("recomp_tracker_v1", JSON.stringify(cloudState));
      } else {
        throw new Error("Invalid Sync ID");
      }
    } catch (e) {
      throw e;
    }
  };

  const setHabit = (dateStr: string, type: "morning" | "evening", value: boolean) => {
    setAndPush((prev) => ({
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
    setAndPush((prev) => {
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
    setAndPush((prev) => {
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
    setAndPush((prev) => ({
      ...prev,
      weightLogs: {
        ...prev.weightLogs,
        [week]: weight,
      },
    }));
  };

  const setActiveWeekDay = (week: number, day: number) => {
    // We don't necessarily need to push to cloud just for navigating tabs,
    // but saving it keeps devices perfectly in sync on what day they are viewing.
    // For performance, we could skip pushing here, but let's push so it's fully synced.
    setAndPush((prev) => ({
      ...prev,
      activeWeek: week,
      activeDayOfWeek: day,
    }));
  };

  if (!isLoaded) return null; // Avoid hydration mismatch

  return (
    <ProtocolContext.Provider value={{ state, setSyncId, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay }}>
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
