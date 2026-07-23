"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProtocolDateInfo, Program, DEFAULT_IRONCORE_PROGRAM, Exercise, DayRoutine, DayRoutineItem, CompoundGroup } from "@/data/protocol";

// ── Data version for localStorage migration ──
const DATA_VERSION = 2;

// ── Types ──

export type DropLog = { weight: string; reps: string };

export type SetLog = {
  weight: string;
  reps: string;
  drops?: DropLog[];
  rating?: string;
  isPulled?: boolean;    // true if this data came from "Pull Last Week"
  isCompleted?: boolean; // true when user explicitly confirms this set
  hasDrops?: boolean;    // true if user toggled drop-set on this individual set
};

export type TrackedLift = { id: string; name: string; muscle: string; color: string };

/** Custom routine for a day-of-week, extending or replacing the program's schema. */
export type CustomDayRoutine = DayRoutine & {
  isPartial?: boolean;
};

export type ProtocolState = {
  dataVersion?: number;
  activeWeek: number;
  activeDayOfWeek: number;
  workoutLogs: Record<string, Record<string, SetLog[]>>; // { dateStr: { exerciseId: [SetLog] } }
  weightLogs: Record<number, string>; // { weekNumber: weightStr }
  habits: Record<string, { morning: boolean; evening: boolean }>; // { dateStr: { ... } }
  customRoutine?: Record<number, CustomDayRoutine>; // { dayNum: DayRoutine }
  customDailyExercises?: Record<string, Exercise[]>; // { dateStr: Exercise[] }
  ignoredDailyExercises?: Record<string, string[]>; // { dateStr: exerciseId[] }
  swappedDailyExercises?: Record<string, Record<string, Exercise>>; // { dateStr: { oldId: newExercise } }
  compoundGroups?: Record<string, CompoundGroup[]>;   // { dateStr: CompoundGroup[] }
  supersetLinks?: Record<string, string>;              // { exerciseId: partnerExerciseId }
  timer: { isActive: boolean; endTime: number; isPaused: boolean; duration: number };
  trackedLifts: TrackedLift[];
  programs: Record<string, Program>;
  activeProgramId: string;
};

type ProtocolContextType = {
  state: ProtocolState;
  setHabit: (dateStr: string, type: "morning" | "evening", value: boolean) => void;
  setWorkoutLog: (dateStr: string, exerciseId: string, setIndex: number, log: SetLog) => void;
  setFullExerciseLogs: (dateStr: string, exerciseId: string, logs: SetLog[]) => void;
  setWeightLog: (week: number, weight: string) => void;
  setActiveWeekDay: (week: number, day: number) => void;
  addCustomExercise: (exercise: Exercise, scope: "today" | "every_week", dayNum: number, dateStr: string) => void;
  swapExercise: (dayNum: number, dateStr: string, oldExerciseId: string, newExercise: Exercise, scope: "today" | "every_week") => void;
  removeExercise: (dayNum: number, dateStr: string, exerciseId: string) => void;
  setCustomDayRoutine: (dayNum: number, name: string, focus: string) => void;
  syncWithUser: (userId: string) => void;
  updateTimer: (updates: Partial<ProtocolState["timer"]>) => void;
  startTimer: (seconds: number) => void;
  addTrackedLift: (lift: TrackedLift) => void;
  removeTrackedLift: (id: string) => void;
  saveProgram: (program: Program) => void;
  setActiveProgram: (id: string) => void;
  linkSuperset: (exerciseAId: string, exerciseBId: string) => void;
  unlinkSuperset: (exerciseId: string) => void;
  addCompoundGroup: (dateStr: string, group: CompoundGroup) => void;
  removeCompoundGroup: (dateStr: string, groupId: string) => void;
};

const { currentWeek, currentDayOfWeek } = getCurrentProtocolDateInfo();

const initialState: ProtocolState = {
  dataVersion: DATA_VERSION,
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
  programs: {
    [DEFAULT_IRONCORE_PROGRAM.id]: DEFAULT_IRONCORE_PROGRAM
  },
  activeProgramId: DEFAULT_IRONCORE_PROGRAM.id,
};

// ── Migration helper ──
function migrateState(parsed: Record<string, unknown>): ProtocolState {
  const version = (parsed.dataVersion as number) || 1;
  const state = parsed as unknown as ProtocolState;

  if (version < 2) {
    // v1 → v2: Ensure new fields exist
    state.supersetLinks = state.supersetLinks || {};
    state.compoundGroups = state.compoundGroups || {};
    state.dataVersion = DATA_VERSION;
  }

  return state;
}

// Module-level guard: survives component remounts, only resets on full page reload
let _hasSynced = false;

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProtocolState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`gym_pwa_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const migrated = migrateState(parsed);
          // Allow users to resume where they left off by not overriding the week/day
          setState({
            ...migrated,
            programs: {
              ...migrated.programs,
              [DEFAULT_IRONCORE_PROGRAM.id]: DEFAULT_IRONCORE_PROGRAM
            },
            activeWeek: migrated.activeWeek || 1,
            activeDayOfWeek: migrated.activeDayOfWeek || 1,
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
      try {
        localStorage.setItem(`gym_pwa_${userId}`, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save state to localStorage", e);
      }
    }
  }, [state, isLoaded, userId]);

  const syncWithUser = useCallback(async (id: string) => {
    // Module-level guard: only sync once per browser tab session
    if (_hasSynced) return;
    _hasSynced = true;
    
    setUserId(id);
    
    // Attempt to pull from Supabase to merge/override local
    try {
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
    } catch (e) {
      console.error("Error syncing workout logs:", e);
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
    
    // Async sync to Supabase OUTSIDE of setState (fire and forget)
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

  const addCustomExercise = useCallback((exercise: Exercise, scope: "today" | "every_week", dayNum: number, dateStr: string) => {
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
          return {
            ...prev,
            customRoutine: {
              ...prev.customRoutine,
              [dayNum]: {
                dayName: "",
                focus: "",
                exercises: [exercise],
                isPartial: true
              }
            }
          };
        }
      }
    });
  }, []);

  const swapExercise = useCallback((dayNum: number, dateStr: string, oldExerciseId: string, newExercise: Exercise, scope: "today" | "every_week") => {
    setState((prev) => {
      if (scope === "today") {
        return {
          ...prev,
          swappedDailyExercises: {
            ...prev.swappedDailyExercises,
            [dateStr]: {
              ...(prev.swappedDailyExercises?.[dateStr] || {}),
              [oldExerciseId]: newExercise
            }
          }
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
                exercises: existingRoutine.exercises.map(ex => ex.id === oldExerciseId ? newExercise : ex)
              }
            }
          };
        } else {
          return prev; // Should not happen since we can only swap existing exercises
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

      // Add to ignored list so base program exercises are hidden
      const newIgnored = { ...prev.ignoredDailyExercises };
      const currentIgnored = newIgnored[dateStr] || [];
      if (!currentIgnored.includes(exerciseId)) {
        newIgnored[dateStr] = [...currentIgnored, exerciseId];
      }

      const newCustomRoutine = { ...prev.customRoutine };

      // Also clean up superset links if this exercise was in one
      const newSupersetLinks = { ...prev.supersetLinks };
      const partnerId = newSupersetLinks[exerciseId];
      if (partnerId) {
        delete newSupersetLinks[exerciseId];
        delete newSupersetLinks[partnerId];
      }

      return {
        ...prev,
        customDailyExercises: newCustomDaily,
        ignoredDailyExercises: newIgnored,
        supersetLinks: newSupersetLinks,
        customRoutine: newCustomRoutine[dayNum] ? {
          ...newCustomRoutine,
          [dayNum]: {
            ...newCustomRoutine[dayNum],
            exercises: newCustomRoutine[dayNum].exercises.filter((ex: Exercise) => ex.id !== exerciseId)
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

  const saveProgram = useCallback((program: Program) => {
    setState(prev => ({
      ...prev,
      programs: {
        ...prev.programs,
        [program.id]: program
      }
    }));
  }, []);

  const setActiveProgram = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      activeProgramId: id,
      activeWeek: 1, // Reset to week 1 when changing programs
    }));
  }, []);

  // ── Superset linking ──

  const linkSuperset = useCallback((exerciseAId: string, exerciseBId: string) => {
    setState(prev => ({
      ...prev,
      supersetLinks: {
        ...prev.supersetLinks,
        [exerciseAId]: exerciseBId,
        [exerciseBId]: exerciseAId,
      }
    }));
  }, []);

  const unlinkSuperset = useCallback((exerciseId: string) => {
    setState(prev => {
      const links = { ...prev.supersetLinks };
      const partnerId = links[exerciseId];
      if (partnerId) {
        delete links[partnerId];
      }
      delete links[exerciseId];
      return { ...prev, supersetLinks: links };
    });
  }, []);

  // ── Compound groups ──

  const addCompoundGroup = useCallback((dateStr: string, group: CompoundGroup) => {
    setState(prev => {
      const existing = prev.compoundGroups?.[dateStr] || [];
      return {
        ...prev,
        compoundGroups: {
          ...prev.compoundGroups,
          [dateStr]: [...existing, group],
        }
      };
    });
  }, []);

  const removeCompoundGroup = useCallback((dateStr: string, groupId: string) => {
    setState(prev => {
      const existing = prev.compoundGroups?.[dateStr] || [];
      return {
        ...prev,
        compoundGroups: {
          ...prev.compoundGroups,
          [dateStr]: existing.filter(g => g.id !== groupId),
        }
      };
    });
  }, []);

  const contextValue = useMemo(() => ({
    state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay, addCustomExercise, swapExercise, removeExercise, setCustomDayRoutine, syncWithUser, updateTimer, startTimer, addTrackedLift, removeTrackedLift, saveProgram, setActiveProgram, linkSuperset, unlinkSuperset, addCompoundGroup, removeCompoundGroup
  }), [state, setHabit, setWorkoutLog, setFullExerciseLogs, setWeightLog, setActiveWeekDay, addCustomExercise, swapExercise, removeExercise, setCustomDayRoutine, syncWithUser, updateTimer, startTimer, addTrackedLift, removeTrackedLift, saveProgram, setActiveProgram, linkSuperset, unlinkSuperset, addCompoundGroup, removeCompoundGroup]);

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
