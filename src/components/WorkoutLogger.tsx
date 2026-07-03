"use client";

import { useProtocol, SetLog } from "@/hooks/useProtocolStore";
import { ROUTINE_SCHEMA, getIntensityDirectives, Exercise, PROTOCOL_WEEKS, PROTOCOL_START_DATE } from "@/data/protocol";
import { Check, ChevronLeft, ChevronRight, Save, Trash2, History } from "lucide-react";
import { useState, useEffect } from "react";

function getProtocolDateString(week: number, dayNum: number) {
  const date = new Date(PROTOCOL_START_DATE);
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  return date.toISOString().split("T")[0];
}

function getShortDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DaySelector() {
  const { state, setActiveWeekDay } = useProtocol();
  const days = [
    { num: 1, label: "Mon" }, { num: 2, label: "Tue" }, { num: 3, label: "Wed" }, { num: 4, label: "Thu" }, { num: 5, label: "Fri" }
  ];

  return (
    <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setActiveWeekDay(Math.max(1, state.activeWeek - 1), state.activeDayOfWeek)}
          className="p-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text hover:text-noir-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
          disabled={state.activeWeek === 1}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold">Week {state.activeWeek}</span>
        <button 
          onClick={() => setActiveWeekDay(Math.min(PROTOCOL_WEEKS, state.activeWeek + 1), state.activeDayOfWeek)}
          className="p-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text hover:text-noir-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
          disabled={state.activeWeek === PROTOCOL_WEEKS}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day) => {
          const isActive = state.activeDayOfWeek === day.num;
          const dateStr = getProtocolDateString(state.activeWeek, day.num);
          const dateLabel = getShortDateLabel(dateStr);
          const dayRoutine = ROUTINE_SCHEMA[day.num];
          const logsForDay = state.workoutLogs[dateStr] || {};
          let isComplete = false;
          if (dayRoutine) {
            isComplete = dayRoutine.exercises.every(ex => {
              const exLogs = logsForDay[ex.id] || [];
              if (exLogs.length < ex.sets) return false;
              return exLogs.slice(0, ex.sets).every(log => log && log.weight !== "" && log.reps !== "");
            });
          }

          return (
            <button
              key={day.num}
              onClick={() => setActiveWeekDay(state.activeWeek, day.num)}
              className={`flex-1 min-w-[56px] min-h-[64px] flex flex-col items-center justify-center rounded-lg border transition-colors relative ${
                isActive ? "bg-noir-accent/10 border-noir-accent text-noir-accent font-bold" : "bg-noir-bg border-noir-border text-noir-text-muted hover:border-noir-text"
              }`}
            >
              <span className="text-xs uppercase">{day.label}</span>
              <span className="text-[10px] opacity-80 mt-1">{dateLabel}</span>
              {isComplete && (
                <div className="absolute -top-1 -right-1 bg-noir-accent rounded-full p-0.5">
                  <Check size={12} className="text-noir-bg font-bold" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, activeWeek, activeDayOfWeek, isFinal, dateStr }: { 
  exercise: Exercise; activeWeek: number; activeDayOfWeek: number; isFinal: boolean; dateStr: string;
}) {
  const { state, setFullExerciseLogs } = useProtocol();
  const dayLogs = state.workoutLogs[dateStr] || {};
  const globalExLogs = dayLogs[exercise.id] || [];
  
  // Local state for inputs so we don't save until "Save" is clicked
  const [localLogs, setLocalLogs] = useState<SetLog[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [compareLogs, setCompareLogs] = useState<SetLog[] | null>(null);

  // Sync local state when global state or date changes
  useEffect(() => {
    // Fill up to the required sets
    const synced = Array.from({ length: exercise.sets }).map((_, i) => {
      if (globalExLogs[i]) {
        // Deep copy to prevent mutating global state directly
        return { 
          weight: globalExLogs[i].weight, 
          reps: globalExLogs[i].reps,
          drops: globalExLogs[i].drops ? [...globalExLogs[i].drops] : []
        };
      }
      return { weight: "", reps: "", drops: [] };
    });
    setLocalLogs(synced);
    setCompareLogs(null); // Reset compare view on date change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalExLogs), exercise.sets, dateStr]);

  const { note, restMod } = getIntensityDirectives(
    activeWeek, activeDayOfWeek, 
    !!exercise.isSpecialization || exercise.name.includes("Lateral") || exercise.name.includes("Curls") || exercise.name.includes("Pushdowns") || exercise.name.includes("Extensions") || exercise.name.includes("Raises"),
    isFinal
  );
  
  const effectiveRest = exercise.rest + (restMod || 0);
  const isDropSetNote = note.toLowerCase().includes("drop set");

  const handleUpdateLocalLog = (setIndex: number, field: "weight" | "reps", value: string) => {
    const newLogs = [...localLogs];
    newLogs[setIndex] = { ...newLogs[setIndex], [field]: value };
    setLocalLogs(newLogs);
  };

  const handleUpdateDropLog = (setIndex: number, dropIndex: number, field: "weight" | "reps", value: string) => {
    const newLogs = [...localLogs];
    const drops = [...(newLogs[setIndex].drops || [])];
    
    // Ensure array is large enough
    while (drops.length <= dropIndex) {
      drops.push({ weight: "", reps: "" });
    }
    
    drops[dropIndex] = { ...drops[dropIndex], [field]: value };
    newLogs[setIndex] = { ...newLogs[setIndex], drops };
    setLocalLogs(newLogs);
  };

  const handleSave = () => {
    setFullExerciseLogs(dateStr, exercise.id, localLogs);
  };

  const handleClear = () => {
    setFullExerciseLogs(dateStr, exercise.id, []);
    setShowClearConfirm(false);
  };

  const handleCompare = () => {
    if (compareLogs !== null) {
      setCompareLogs(null); // Toggle off
      return;
    }
    
    if (activeWeek <= 1) {
      setCompareLogs([]); // Nothing to compare
      return;
    }

    // Fetch previous week's date for this exact day
    const prevDateStr = getProtocolDateString(activeWeek - 1, activeDayOfWeek);
    const prevLogs = state.workoutLogs[prevDateStr]?.[exercise.id] || [];
    setCompareLogs(prevLogs);
  };

  return (
    <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg overflow-hidden relative">
      {showClearConfirm && (
        <div className="absolute inset-0 bg-noir-bg/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">Clear {exercise.name}?</h3>
            <p className="text-sm text-noir-text-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg border border-noir-border hover:bg-noir-surface-light min-h-[44px]">Cancel</button>
              <button onClick={handleClear} className="px-4 py-2 rounded-lg bg-red-600/20 text-red-500 border border-red-900 font-bold hover:bg-red-600/30 min-h-[44px]">Yes, Clear</button>
            </div>
          </div>
        </div>
      )}

      {(note || exercise.notes) && (
        <div className="absolute top-0 right-0 bg-noir-surface-light border-b border-l border-noir-border px-3 py-1 text-[10px] uppercase font-bold text-noir-accent tracking-widest rounded-bl-lg max-w-[70%] text-right z-10">
          {note || exercise.notes}
        </div>
      )}
      
      <div className="mb-4 pr-12 mt-2">
        <h3 className="text-lg md:text-xl font-bold leading-tight">{exercise.name}</h3>
        <p className="text-xs md:text-sm text-noir-text-muted mt-1 flex items-center gap-2">
          {exercise.sets} Sets × {exercise.reps} 
          <span className="inline-block w-1 h-1 rounded-full bg-noir-border"></span> 
          {effectiveRest}s Rest
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {localLogs.map((log, i) => {
          const isFinalSet = i === exercise.sets - 1;
          const showDropSets = isFinalSet && isDropSetNote;
          
          return (
            <div key={i} className="flex flex-col gap-2 p-2 rounded-lg bg-noir-bg border border-transparent focus-within:border-noir-border transition-colors">
              <div className="flex gap-2 items-center">
                <span className="w-6 text-center text-xs font-bold text-noir-text-muted">S{i + 1}</span>
                <input
                  type="number"
                  placeholder="kg"
                  className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                  value={log.weight}
                  onChange={(e) => handleUpdateLocalLog(i, "weight", e.target.value)}
                />
                <span className="text-noir-text-muted">×</span>
                <input
                  type="number"
                  placeholder="reps"
                  className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                  value={log.reps}
                  onChange={(e) => handleUpdateLocalLog(i, "reps", e.target.value)}
                />
              </div>

              {/* Render 2 additional drop inputs for the final drop set */}
              {showDropSets && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-noir-border border-dashed">
                  <span className="text-[10px] uppercase text-noir-text-muted ml-8 font-bold tracking-widest text-noir-accent">Drop 1</span>
                  <div className="flex gap-2 items-center">
                    <span className="w-6 text-center"></span>
                    <input
                      type="number"
                      placeholder="kg"
                      className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                      value={log.drops?.[0]?.weight || ""}
                      onChange={(e) => handleUpdateDropLog(i, 0, "weight", e.target.value)}
                    />
                    <span className="text-noir-text-muted">×</span>
                    <input
                      type="number"
                      placeholder="reps"
                      className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                      value={log.drops?.[0]?.reps || ""}
                      onChange={(e) => handleUpdateDropLog(i, 0, "reps", e.target.value)}
                    />
                  </div>

                  <span className="text-[10px] uppercase text-noir-text-muted ml-8 font-bold tracking-widest text-noir-accent">Drop 2</span>
                  <div className="flex gap-2 items-center">
                    <span className="w-6 text-center"></span>
                    <input
                      type="number"
                      placeholder="kg"
                      className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                      value={log.drops?.[1]?.weight || ""}
                      onChange={(e) => handleUpdateDropLog(i, 1, "weight", e.target.value)}
                    />
                    <span className="text-noir-text-muted">×</span>
                    <input
                      type="number"
                      placeholder="reps"
                      className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                      value={log.drops?.[1]?.reps || ""}
                      onChange={(e) => handleUpdateDropLog(i, 1, "reps", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compare View */}
      {compareLogs !== null && (
        <div className="bg-noir-bg rounded-lg p-3 mb-4 border border-noir-border animate-in fade-in zoom-in-95 duration-200">
          <h4 className="text-xs font-bold uppercase text-noir-text-muted mb-2 tracking-widest">Previous Week (W{activeWeek - 1})</h4>
          {compareLogs.length === 0 ? (
            <p className="text-sm text-noir-text-muted">No data recorded.</p>
          ) : (
            <div className="space-y-1">
              {compareLogs.map((log, i) => (
                <div key={i} className="text-sm">
                  <span className="w-6 inline-block text-xs text-noir-text-muted">S{i+1}</span>
                  <span className="font-mono font-bold text-noir-accent">{log.weight}</span>kg × <span className="font-mono font-bold text-noir-accent">{log.reps}</span>
                  {log.drops?.map((drop, di) => (
                    <div key={di} className="ml-6 text-xs text-noir-text-muted">
                      Drop {di+1}: {drop.weight}kg × {drop.reps}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 items-center pt-3 border-t border-noir-border">
        <button onClick={handleSave} className="flex-1 bg-noir-accent text-noir-bg font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 min-h-[44px]">
          <Save size={18} /> Save
        </button>
        <button onClick={handleCompare} className={`px-3 py-2 rounded-lg border flex items-center justify-center min-h-[44px] ${compareLogs !== null ? 'bg-noir-accent/10 border-noir-accent text-noir-accent' : 'bg-noir-bg border-noir-border text-noir-text-muted hover:text-noir-text'}`}>
          <History size={18} />
        </button>
        <button onClick={() => setShowClearConfirm(true)} className="px-3 py-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text-muted hover:text-red-500 hover:border-red-500 transition-colors min-h-[44px]">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutLogger() {
  const { state } = useProtocol();
  const dayRoutine = ROUTINE_SCHEMA[state.activeDayOfWeek];
  const dateStr = getProtocolDateString(state.activeWeek, state.activeDayOfWeek);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <DaySelector />

      {!dayRoutine ? (
        <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Rest Day</h2>
          <p className="text-noir-text-muted">Recovery is where growth happens. Focus on hydration, nutrition, and sleep.</p>
        </div>
      ) : (
        <>
          <header className="mb-4 px-2 flex justify-between items-end">
            <div>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">{dayRoutine.dayName}</h2>
              <h1 className="text-3xl font-black">{dayRoutine.focus}</h1>
            </div>
            <div className="text-right text-xs text-noir-text-muted">
              {getShortDateLabel(dateStr)}
            </div>
          </header>
          
          <div className="space-y-4">
            {dayRoutine.exercises.map((ex, index) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                activeWeek={state.activeWeek}
                activeDayOfWeek={state.activeDayOfWeek}
                isFinal={index === dayRoutine.exercises.length - 1}
                dateStr={dateStr}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
