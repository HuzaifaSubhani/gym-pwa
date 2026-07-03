"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { ROUTINE_SCHEMA, getIntensityDirectives, Exercise, PROTOCOL_WEEKS, PROTOCOL_START_DATE } from "@/data/protocol";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

function getProtocolDateString(week: number, dayNum: number) {
  const date = new Date(PROTOCOL_START_DATE);
  // week 1, day 1 is +0 days.
  // week W, day D is +((W-1)*7 + (D-1)) days
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  return date.toISOString().split("T")[0];
}

function getShortDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "Jul 6"
}

function DaySelector() {
  const { state, setActiveWeekDay } = useProtocol();
  const days = [
    { num: 1, label: "Mon" },
    { num: 2, label: "Tue" },
    { num: 3, label: "Wed" },
    { num: 4, label: "Thu" },
    { num: 5, label: "Fri" }
  ];

  return (
    <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg mb-6 flex flex-col gap-4">
      {/* Week Selector */}
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
      
      {/* Day Selector */}
      <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day) => {
          const isActive = state.activeDayOfWeek === day.num;
          const dateStr = getProtocolDateString(state.activeWeek, day.num);
          const dateLabel = getShortDateLabel(dateStr);
          
          // Check if day is complete (all exercises for this day have all sets filled)
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
                isActive 
                  ? "bg-noir-accent/10 border-noir-accent text-noir-accent font-bold" 
                  : "bg-noir-bg border-noir-border text-noir-text-muted hover:border-noir-text"
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

function ExerciseCard({ 
  exercise, 
  activeWeek,
  activeDayOfWeek, 
  isFinal,
  dateStr
}: { 
  exercise: Exercise;
  activeWeek: number;
  activeDayOfWeek: number;
  isFinal: boolean;
  dateStr: string;
}) {
  const { state, setWorkoutLog } = useProtocol();
  const dayLogs = state.workoutLogs[dateStr] || {};
  const exLogs = dayLogs[exercise.id] || [];
  
  const { note, restMod } = getIntensityDirectives(
    activeWeek, 
    activeDayOfWeek, 
    !!exercise.isSpecialization || exercise.name.includes("Lateral") || exercise.name.includes("Curls") || exercise.name.includes("Pushdowns") || exercise.name.includes("Extensions") || exercise.name.includes("Raises"),
    isFinal
  );
  
  const effectiveRest = exercise.rest + (restMod || 0);

  return (
    <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg overflow-hidden relative">
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

      <div className="space-y-3">
        {Array.from({ length: exercise.sets }).map((_, i) => {
          const log = exLogs[i] || { weight: "", reps: "" };
          const isComplete = log.weight !== "" && log.reps !== "";
          
          return (
            <div key={i} className={`flex gap-2 items-center p-2 rounded-lg border transition-colors ${isComplete ? 'bg-noir-bg border-noir-accent/30' : 'bg-noir-bg border-transparent'}`}>
              <span className="w-6 text-center text-xs font-bold text-noir-text-muted">S{i + 1}</span>
              <input
                type="number"
                placeholder="kg"
                className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                value={log.weight}
                onChange={(e) => setWorkoutLog(dateStr, exercise.id, i, { ...log, weight: e.target.value })}
              />
              <span className="text-noir-text-muted">×</span>
              <input
                type="number"
                placeholder="reps"
                className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
                value={log.reps}
                onChange={(e) => setWorkoutLog(dateStr, exercise.id, i, { ...log, reps: e.target.value })}
              />
              <div className="flex-1 flex justify-end pr-2">
                {isComplete && <Check size={20} className="text-noir-accent" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkoutLogger() {
  const { state } = useProtocol();
  const dayRoutine = ROUTINE_SCHEMA[state.activeDayOfWeek];
  // Calculate specific date string based on the selected week and day
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
