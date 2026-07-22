"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { DEFAULT_IRONCORE_PROGRAM, getIntensityDirectives, Exercise, CompoundGroup } from "@/data/protocol";
import { Check, ChevronLeft, ChevronRight, Trash2, Shield, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import TourGuide from "@/components/shared/TourGuide";
import ExerciseCard from "@/components/workouts/ExerciseCard";
import CompoundSetCard from "@/components/workouts/CompoundSetCard";
import AddExerciseModal from "@/components/modals/AddExerciseModal";
import CreateGiantSetModal from "@/components/modals/CreateGiantSetModal";
import { getProtocolDateString, getShortDateLabel, getTodayDateString } from "@/lib/dateUtils";

function DaySelector() {
  const { state, setActiveWeekDay } = useProtocol();
  const days = [
    { num: 1, label: "Mon" }, { num: 2, label: "Tue" }, { num: 3, label: "Wed" }, 
    { num: 4, label: "Thu" }, { num: 5, label: "Fri" }, { num: 6, label: "Sat" }, { num: 7, label: "Sun" }
  ];

  const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;

  return (
    <div id="tour-day-selector" className="bg-noir-surface rounded-xl border border-noir-border p-3 shadow-lg mb-6 flex items-center gap-2">
      <button
        onClick={() => setActiveWeekDay(Math.max(1, state.activeWeek - 1), state.activeDayOfWeek)}
        className="shrink-0 p-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text hover:text-noir-accent transition-colors disabled:opacity-50"
        disabled={state.activeWeek === 1}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {days.map((day) => {
          const isActive = state.activeDayOfWeek === day.num;
          const dateStr = getProtocolDateString(state.activeWeek, day.num);
          const dateLabel = getShortDateLabel(dateStr);
          
          let dayRoutine = activeProgram.routine_schema[day.num];
          if (state.customRoutine?.[day.num]) {
            const custom = state.customRoutine[day.num];
            if (custom.isPartial && dayRoutine) {
              dayRoutine = { ...dayRoutine, exercises: [...dayRoutine.exercises, ...custom.exercises] };
            } else {
              dayRoutine = custom;
            }
          }

          const dailyExtras = state.customDailyExercises?.[dateStr] || [];
          const logsForDay = state.workoutLogs[dateStr] || {};
          let isComplete = false;
          
          const ignored = state.ignoredDailyExercises?.[dateStr] || [];
          const allExercises = dayRoutine ? [...dayRoutine.exercises, ...dailyExtras] : [...dailyExtras];
          const visibleExercises = allExercises.filter(ex => !ignored.includes(ex.id));
          
          if (visibleExercises.length > 0) {
            isComplete = visibleExercises.every(ex => {
              const exLogs = logsForDay[ex.id] || [];
              if (exLogs.length < ex.sets) return false;
              return exLogs.slice(0, ex.sets).every(log => log && log.weight !== "" && log.reps !== "");
            });
          }

          return (
            <button
              key={day.num}
              onClick={() => setActiveWeekDay(state.activeWeek, day.num)}
              className={`shrink-0 snap-center min-w-[70px] flex flex-col items-center p-2 rounded-lg border transition-all ${
                isActive 
                  ? "bg-noir-accent/10 border-noir-accent shadow-lg text-white" 
                  : "bg-noir-bg border-noir-border text-noir-text hover:border-noir-border/80"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-widest relative w-full text-center">
                {day.label}
                {isComplete && (
                  <span className="absolute -right-1 -top-1 w-3 h-3 bg-noir-accent rounded-full flex items-center justify-center border border-noir-surface">
                    <Check size={8} className="text-noir-bg" />
                  </span>
                )}
              </div>
              <div className={`text-xs mt-1 ${isActive ? "text-noir-accent font-bold" : "text-noir-text-muted"}`}>{dateLabel}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setActiveWeekDay(Math.min(activeProgram.duration_weeks, state.activeWeek + 1), state.activeDayOfWeek)}
        className="shrink-0 p-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text hover:text-noir-accent transition-colors disabled:opacity-50"
        disabled={state.activeWeek === activeProgram.duration_weeks}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default function WorkoutLogger() {
  const { 
    state, 
    addCustomExercise, 
    setCustomDayRoutine, 
    addCompoundGroup, 
    removeExercise, 
    linkSuperset,
    swapExercise 
  } = useProtocol();
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [isGiantSetModalOpen, setIsGiantSetModalOpen] = useState(false);
  const [isEditRoutineModalOpen, setIsEditRoutineModalOpen] = useState(false);
  const [routineNameEdit, setRoutineNameEdit] = useState("");
  const [routineFocusEdit, setRoutineFocusEdit] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
  const dateStr = getProtocolDateString(state.activeWeek, state.activeDayOfWeek);
  const todayStr = getTodayDateString();
  const isFuture = dateStr > todayStr;

  // Merge custom routines
  const activeProgramData = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
  let dayRoutine = activeProgramData.routine_schema[state.activeDayOfWeek];
  let mergedRoutine = dayRoutine;
  if (state.customRoutine?.[state.activeDayOfWeek]) {
    const custom = state.customRoutine[state.activeDayOfWeek];
    if (custom.isPartial && dayRoutine) {
      mergedRoutine = { ...dayRoutine, exercises: [...dayRoutine.exercises, ...custom.exercises] };
    } else {
      mergedRoutine = custom;
    }
  }

  const dailyExtras = state.customDailyExercises?.[dateStr] || [];
  const ignoredDaily = state.ignoredDailyExercises?.[dateStr] || [];
  const swappedDaily = state.swappedDailyExercises?.[dateStr] || {};
  const compoundGroups = state.compoundGroups?.[dateStr] || [];
  const finalExercises: Exercise[] = (mergedRoutine ? [...mergedRoutine.exercises, ...dailyExtras] : [...dailyExtras])
    .filter(ex => !ignoredDaily.includes(ex.id))
    .map(ex => swappedDaily[ex.id] || ex);

  // Filter out exercises that are part of a superset pair (show superset partner inline in the card)
  // Don't filter — both exercises render their own card, and the card shows the link
  
  const logsForDay = state.workoutLogs[dateStr] || {};
  let isComplete = false;
  if (finalExercises.length > 0 || compoundGroups.length > 0) {
    const exercisesComplete = finalExercises.length === 0 || finalExercises.every(ex => {
      const exLogs = logsForDay[ex.id] || [];
      if (exLogs.length < ex.sets) return false;
      return exLogs.slice(0, ex.sets).every(log => log && log.weight !== "" && log.reps !== "");
    });

    const groupsComplete = compoundGroups.length === 0 || compoundGroups.every(group => {
      return group.exercises.every(ex => {
        const exLogs = logsForDay[ex.id] || [];
        return exLogs.length >= group.rounds && exLogs.every(l => l.weight !== "" && l.reps !== "");
      });
    });

    isComplete = exercisesComplete && groupsComplete;
  }

  const prevDateRef = useRef(dateStr);
  const prevIsCompleteRef = useRef(isComplete);
  
  useEffect(() => {
    if (prevDateRef.current !== dateStr) {
      prevDateRef.current = dateStr;
      prevIsCompleteRef.current = isComplete;
      return;
    }

    if (isComplete && !prevIsCompleteRef.current) {
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete, dateStr]);

  const hasContent = finalExercises.length > 0 || compoundGroups.length > 0;

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <DaySelector />

      {!hasContent ? (
        <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Rest Day</h2>
          <p className="text-noir-text-muted mb-6">Recovery is where growth happens. Focus on hydration, nutrition, and sleep.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setIsAddExerciseOpen(true)}
              className="px-6 py-3 border-2 border-dashed border-noir-border rounded-xl text-noir-text-muted hover:text-noir-accent hover:border-noir-accent hover:bg-noir-accent/5 transition-all inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
            >
              + Add Exercise
            </button>
            <button 
              onClick={() => setIsGiantSetModalOpen(true)}
              className="px-6 py-3 border-2 border-dashed border-purple-500/30 rounded-xl text-noir-text-muted hover:text-purple-400 hover:border-purple-400 hover:bg-purple-400/5 transition-all inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
            >
              🔄 Create Giant Set
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="mb-4 px-2 flex justify-between items-end">
            <div>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">{mergedRoutine?.dayName || "Custom Day"}</h2>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">{mergedRoutine?.focus || "Custom Workout"}</h1>
                <button onClick={() => {
                  setRoutineNameEdit(mergedRoutine?.dayName || "Custom Day");
                  setRoutineFocusEdit(mergedRoutine?.focus || "Custom Workout");
                  setIsEditRoutineModalOpen(true);
                }} className="text-noir-text-muted hover:text-noir-accent transition-colors text-xs border border-noir-border px-2 py-1 rounded-lg uppercase tracking-wider font-bold">Edit</button>
              </div>
            </div>
            <div className="text-right text-xs text-noir-text-muted">
              {getShortDateLabel(dateStr)}
            </div>
          </header>

          {isFuture && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-noir-surface border border-noir-border flex items-center justify-between shadow-lg">
              <span className="text-sm font-bold text-noir-text-muted">This workout is scheduled for a future date.</span>
              <Shield size={18} className="text-noir-accent" />
            </div>
          )}

          <div className="space-y-4">
            {/* Regular Exercises */}
            {finalExercises.map((ex, index) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                activeWeek={state.activeWeek}
                activeDayOfWeek={state.activeDayOfWeek}
                isFinal={index === finalExercises.length - 1}
                dateStr={dateStr}
                isFuture={isFuture}
                allExercises={finalExercises}
                onRemove={() => removeExercise(state.activeDayOfWeek, dateStr, ex.id)}
                onSwap={() => {
                  setSwapTargetId(ex.id);
                  setIsAddExerciseOpen(true);
                }}
                onSuperset={(partnerId) => linkSuperset(ex.id, partnerId)}
              />
            ))}

            {/* Compound/Giant Sets */}
            {compoundGroups.map(group => (
              <CompoundSetCard
                key={group.id}
                group={group}
                dateStr={dateStr}
                isFuture={isFuture}
              />
            ))}
            
            {/* Add buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => setIsAddExerciseOpen(true)}
                className="flex-1 py-4 border-2 border-dashed border-noir-border rounded-xl text-noir-text-muted hover:text-noir-accent hover:border-noir-accent hover:bg-noir-accent/5 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
              >
                <Plus size={16} /> Add Exercise
              </button>
              <button 
                onClick={() => setIsGiantSetModalOpen(true)}
                className="py-4 px-4 border-2 border-dashed border-purple-500/30 rounded-xl text-noir-text-muted hover:text-purple-400 hover:border-purple-400 hover:bg-purple-400/5 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
              >
                🔄 Giant Set
              </button>
            </div>
          </div>
        </>
      )}
      </div>
      
      <AddExerciseModal 
        isOpen={isAddExerciseOpen} 
        onClose={() => {
          setIsAddExerciseOpen(false);
          setSwapTargetId(null);
        }}
        onAdd={(ex, scope) => {
          if (swapTargetId) {
            swapExercise(state.activeDayOfWeek, dateStr, swapTargetId, ex, scope);
            setSwapTargetId(null);
          } else {
            addCustomExercise(ex, scope, state.activeDayOfWeek, dateStr);
          }
        }}
      />

      <CreateGiantSetModal
        isOpen={isGiantSetModalOpen}
        onClose={() => setIsGiantSetModalOpen(false)}
        onAdd={(group) => addCompoundGroup(dateStr, group)}
      />

      <TourGuide />

      {/* Edit Routine Modal */}
      {isEditRoutineModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-noir-bg/80 backdrop-blur-sm">
          <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-noir-accent">Build Custom Routine</h2>
            <p className="text-sm text-noir-text-muted mb-4">{(mergedRoutine as any)?.isPartial === false ? "Update the name and focus of your custom day." : "This will clear the current day's protocol exercises and let you build a completely custom day."}</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!routineNameEdit || !routineFocusEdit) return;
              setCustomDayRoutine(state.activeDayOfWeek, routineNameEdit, routineFocusEdit);
              setIsEditRoutineModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Day Name</label>
                <input required type="text" value={routineNameEdit} onChange={e => setRoutineNameEdit(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent" placeholder="e.g. Arms Day" />
              </div>
              <div>
                <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Focus</label>
                <input required type="text" value={routineFocusEdit} onChange={e => setRoutineFocusEdit(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent" placeholder="e.g. Biceps & Triceps" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-noir-border">
                <button type="button" onClick={() => setIsEditRoutineModalOpen(false)} className="flex-1 px-4 py-3 rounded-lg border border-noir-border hover:bg-noir-surface-light font-bold">Cancel</button>
                <button type="submit" className={`flex-1 px-4 py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform ${(mergedRoutine as any)?.isPartial === false ? "bg-noir-accent text-noir-bg hover:opacity-90" : "bg-red-600/20 text-red-500 border border-red-900 hover:bg-red-600/30"}`}>
                  {(mergedRoutine as any)?.isPartial === false ? "Update Custom Day" : <><Trash2 size={16} /> Wipe & Build Custom</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
}
