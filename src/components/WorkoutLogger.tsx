"use client";

import { useProtocol, SetLog } from "@/hooks/useProtocolStore";
import { ROUTINE_SCHEMA, getIntensityDirectives, Exercise, PROTOCOL_WEEKS, PROTOCOL_START_DATE } from "@/data/protocol";
import { Check, ChevronLeft, ChevronRight, Trash2, History, Loader2, Play, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import TourGuide from "./TourGuide";
import ExerciseVideoModal from "./ExerciseVideoModal";

function getProtocolDateString(week: number, dayNum: number) {
  const date = new Date(PROTOCOL_START_DATE);
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getShortDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DaySelector() {
  const { state, setActiveWeekDay } = useProtocol();
  const days = [
    { num: 1, label: "Mon" }, { num: 2, label: "Tue" }, { num: 3, label: "Wed" }, 
    { num: 4, label: "Thu" }, { num: 5, label: "Fri" }, { num: 6, label: "Sat" }, { num: 7, label: "Sun" }
  ];

  return (
    <div id="tour-day-selector" className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg mb-6 flex flex-col gap-4">
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
          
          let dayRoutine = ROUTINE_SCHEMA[day.num];
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
          
          const allExercises = dayRoutine ? [...dayRoutine.exercises, ...dailyExtras] : [...dailyExtras];
          
          if (allExercises.length > 0) {
            isComplete = allExercises.every(ex => {
              const exLogs = logsForDay[ex.id] || [];
              if (exLogs.length < ex.sets) return false;
              return exLogs.slice(0, ex.sets).every(log => log && log.weight !== "" && log.reps !== "");
            });
          }

          return (
            <button
              key={day.num}
              onClick={() => setActiveWeekDay(state.activeWeek, day.num)}
              className={`flex-1 min-w-[56px] min-h-[64px] flex flex-col items-center justify-center rounded-lg border transition-colors relative ${isActive ? "bg-noir-accent/10 border-noir-accent text-noir-accent font-bold" : "bg-noir-bg border-noir-border text-noir-text-muted hover:border-noir-text"
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
  const { state, setFullExerciseLogs, removeExercise, startTimer } = useProtocol();
  const dayLogs = state.workoutLogs[dateStr] || {};
  const globalExLogs = dayLogs[exercise.id] || [];

  const prevDateStr = activeWeek > 1 ? getProtocolDateString(activeWeek - 1, activeDayOfWeek) : null;
  const prevLogs = prevDateStr ? state.workoutLogs[prevDateStr]?.[exercise.id] || [] : [];

  // Local state for inputs
  const [localLogs, setLocalLogs] = useState<SetLog[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  // To track if changes were made by user (to avoid saving on mount)
  const [isDirty, setIsDirty] = useState(false);

  const isExerciseComplete = localLogs.length > 0 && localLogs.length === exercise.sets && localLogs.every(log => log.weight !== "" && log.reps !== "");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Sync local state when global state or date changes
  useEffect(() => {
    if (isDirty) return;
    // Fill up to the required sets
    const synced = Array.from({ length: exercise.sets }).map((_, i) => {
      if (globalExLogs[i]) {
        return {
          weight: globalExLogs[i].weight,
          reps: globalExLogs[i].reps,
          drops: globalExLogs[i].drops ? [...globalExLogs[i].drops] : [],
          rating: globalExLogs[i].rating
        };
      }
      return { weight: "", reps: "", drops: [] };
    });
    setLocalLogs(synced);
    setIsDirty(false); // Reset dirty flag when syncing from global
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalExLogs), exercise.sets, dateStr]);

  // Auto-save effect
  useEffect(() => {
    if (!isDirty) return;

    const timeout = setTimeout(() => {
      setFullExerciseLogs(dateStr, exercise.id, localLogs);
      setIsDirty(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeout);
  }, [localLogs, isDirty, dateStr, exercise.id, setFullExerciseLogs]);

  const { note, restMod } = getIntensityDirectives(
    activeWeek, activeDayOfWeek,
    !!exercise.isSpecialization || exercise.name.includes("Lateral") || exercise.name.includes("Curls") || exercise.name.includes("Pushdowns") || exercise.name.includes("Extensions") || exercise.name.includes("Raises"),
    isFinal
  );

  const effectiveRest = exercise.rest + (restMod || 0);
  const fullNote = ((note || "") + " " + (exercise.notes || "")).toLowerCase();
  const isDropSetNote = fullNote.includes("drop set");

  const handleUpdateLocalLog = (setIndex: number, field: "weight" | "reps" | "rating", value: string) => {
    const newLogs = [...localLogs];
    newLogs[setIndex] = { ...newLogs[setIndex], [field]: value };
    setLocalLogs(newLogs);
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const handleClear = () => {
    setFullExerciseLogs(dateStr, exercise.id, []);
    setShowClearConfirm(false);
  };

  const handleDeleteExercise = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove ${exercise.name}?`)) {
      removeExercise(activeDayOfWeek, dateStr, exercise.id);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeWeek <= 1) return;

    const prevDateStr = getProtocolDateString(activeWeek - 1, activeDayOfWeek);
    const prevLogs = state.workoutLogs[prevDateStr]?.[exercise.id] || [];
    if (prevLogs.length === 0) return;

    const mergedLogs = localLogs.map((log, i) => {
      if (prevLogs[i]) {
        return {
          weight: prevLogs[i].weight || log.weight,
          reps: prevLogs[i].reps || log.reps,
          drops: prevLogs[i].drops ? [...prevLogs[i].drops] : (log.drops ? [...log.drops] : [])
        };
      }
      return log;
    });

    setLocalLogs(mergedLogs);
    setIsDirty(true);
    setIsExpanded(true); // Open to show the pulled data
  };

  return (
    <div id="tour-exercise-card" className={`bg-noir-surface rounded-xl border p-4 shadow-lg overflow-hidden relative transition-all duration-300 ${
      isExerciseComplete ? "border-noir-accent/70 shadow-[0_0_15px_rgba(208,56,243,0.15)] bg-noir-surface/90"
      : saveStatus === "saved" ? "border-noir-accent/50 shadow-[0_0_15px_rgba(57,255,20,0.1)]" 
      : "border-noir-border"
    }`}>
      {showClearConfirm && (
        <div className="absolute inset-0 bg-noir-bg/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">Clear {exercise.name}?</h3>
            <p className="text-sm text-noir-text-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={(e) => { e.stopPropagation(); setShowClearConfirm(false); }} className="px-4 py-2 rounded-lg border border-noir-border hover:bg-noir-surface-light min-h-[44px]">Cancel</button>
              <button onClick={(e) => { e.stopPropagation(); handleClear(); }} className="px-4 py-2 rounded-lg bg-red-600/20 text-red-500 border border-red-900 font-bold hover:bg-red-600/30 min-h-[44px]">Yes, Clear</button>
            </div>
          </div>
        </div>
      )}

      {(note || exercise.notes) && (
        <div className="absolute top-0 right-0 bg-noir-surface-light border-b border-l border-noir-border px-3 py-1 text-[10px] uppercase font-bold text-noir-accent tracking-widest rounded-bl-lg max-w-[70%] text-right z-10">
          {note || exercise.notes}
        </div>
      )}

      {/* Header - Clickable to toggle expansion */}
      <div 
        className="mb-2 pr-12 mt-2 cursor-pointer group flex items-start justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg md:text-xl font-bold leading-tight group-hover:text-noir-accent transition-colors flex items-center gap-2">
            {exercise.name}
            {isExerciseComplete && <Check size={18} className="text-noir-accent stroke-[3px]" />}
          </h3>
          <p className="text-xs md:text-sm text-noir-text-muted mt-1 flex items-center gap-2">
            {exercise.sets} Sets × {exercise.reps}
            <span className="inline-block w-1 h-1 rounded-full bg-noir-border"></span>
            {effectiveRest}s Rest
            {exercise.gif_url && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-noir-border"></span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsVideoModalOpen(true); }}
                  className="flex items-center gap-1 text-noir-accent hover:opacity-80 transition-colors bg-noir-accent/10 px-2 py-0.5 rounded border border-noir-accent/30"
                >
                  <Play size={12} className="fill-current" /> <span className="uppercase font-bold tracking-wider text-[9px]">Demo</span>
                </button>
              </>
            )}
          </p>
        </div>
        <div className="text-noir-text-muted group-hover:text-noir-accent transition-colors self-center p-2">
          {isExpanded ? <ChevronLeft size={20} className="-rotate-90 transition-transform" /> : <ChevronLeft size={20} className="rotate-180 transition-transform" />}
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-300 ease-in-out origin-top ${isExpanded ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden"}`}>
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
                  {/* Rating buttons */}
                  <div className="flex gap-1 ml-auto">
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "easy")} 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${log.rating === 'easy' ? 'bg-green-500/20 text-green-500 border border-green-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted'}`}
                    >E</button>
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "hard")} 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${log.rating === 'hard' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted'}`}
                    >H</button>
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "extreme")} 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${log.rating === 'extreme' ? 'bg-red-500/20 text-red-500 border border-red-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted'}`}
                    >X</button>
                  </div>
                </div>

                {prevLogs[i] && prevLogs[i].weight && (
                  <div className="text-[10px] text-noir-text-muted ml-10">
                    Last Week: {prevLogs[i].weight}kg × {prevLogs[i].reps} 
                    {prevLogs[i].rating === 'easy' && ' 🟢 Easy'}
                    {prevLogs[i].rating === 'hard' && ' 🟡 Hard'}
                    {prevLogs[i].rating === 'extreme' && ' 🔴 Extreme'}
                  </div>
                )}

                {/* Render 2 additional drop inputs for the final drop set */}
                {showDropSets && (
                  <div className="mt-2 ml-4 pl-3 border-l-2 border-noir-accent/30 space-y-2 relative">
                    <div className="absolute -left-[14px] top-[-10px] w-3 h-4 border-b-2 border-l-2 border-noir-accent/30 rounded-bl-md"></div>
                    <div className="flex gap-2 items-center">
                      <span className="w-12 text-[10px] uppercase font-bold text-noir-accent tracking-widest text-right">Drop 1</span>
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
                    <div className="flex gap-2 items-center">
                      <span className="w-12 text-[10px] uppercase font-bold text-noir-accent tracking-widest text-right">Drop 2</span>
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

        {/* Actions row */}
        <div className="flex gap-2 items-center pt-3 border-t border-noir-border justify-between">
          <div className="flex items-center gap-2 px-2 text-sm">
            <button 
              onClick={(e) => { e.stopPropagation(); startTimer(effectiveRest); }} 
              className="flex items-center gap-1 text-xs font-bold text-noir-accent uppercase tracking-wider hover:opacity-80 transition-colors bg-noir-accent/10 px-3 py-1.5 rounded-lg border border-noir-accent/30"
            >
              Start {effectiveRest}s Rest
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDeleteExercise} className="px-3 py-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text-muted hover:text-red-500 hover:border-red-500 transition-colors min-h-[44px] text-xs font-bold uppercase tracking-wider">
              Remove
            </button>
            <button onClick={handleCompare} className="px-3 py-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text-muted hover:text-noir-accent hover:border-noir-accent transition-colors min-h-[44px]">
              <History size={18} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowClearConfirm(true); }} className="px-3 py-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text-muted hover:text-red-500 hover:border-red-500 transition-colors min-h-[44px]">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {exercise.gif_url && (
        <ExerciseVideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={exercise.gif_url}
          exerciseName={exercise.name}
        />
      )}
    </div>
  );
}

function AddExerciseModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (ex: any, scope: "today" | "every_week") => void }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-10");
  const [rest, setRest] = useState("60");
  const [scope, setScope] = useState<"today" | "every_week">("today");
  
  const [dbExercises, setDbExercises] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dbExercises.length === 0) {
      fetch('/data/exercises.json')
        .then(res => res.json())
        .then(data => setDbExercises(data))
        .catch(err => console.error("Failed to load exercise db:", err));
    }
  }, [isOpen, dbExercises.length]);

  useEffect(() => {
    if (!name || name.length < 2) {
      setSearchResults([]);
      return;
    }
    const term = name.toLowerCase();
    const results = dbExercises.filter(ex => ex.name.toLowerCase().includes(term)).slice(0, 10);
    setSearchResults(results);
  }, [name, dbExercises]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    onAdd({
      id: `custom_${Date.now()}`,
      name,
      sets: parseInt(sets, 10) || 3,
      reps,
      rest: parseInt(rest, 10) || 60,
      gif_url: selectedGifUrl
    }, scope);
    
    // Reset and close
    setName("");
    setSelectedGifUrl(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-noir-bg/80 backdrop-blur-sm">
      <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-visible">
        <h2 className="text-xl font-bold mb-4">Add Custom Exercise</h2>
        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Exercise Name</label>
            <div className="relative">
              <input 
                required 
                type="text" 
                value={name} 
                onChange={e => {
                  setName(e.target.value);
                  setSelectedGifUrl(undefined);
                  setIsSearching(true);
                }} 
                onFocus={() => setIsSearching(true)}
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 pl-10 text-noir-text focus:outline-none focus:border-noir-accent" 
                placeholder="Search or type custom name..." 
              />
              <Search className="absolute left-3 top-3.5 text-noir-text-muted" size={18} />
            </div>

            {isSearching && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-noir-surface border border-noir-border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map(res => (
                  <div 
                    key={res.id} 
                    className="p-3 hover:bg-noir-bg cursor-pointer border-b border-noir-border/50 last:border-0 flex items-center justify-between"
                    onClick={() => {
                      setName(res.name);
                      setSelectedGifUrl(res.g);
                      setSearchResults([]);
                      setIsSearching(false);
                    }}
                  >
                    <div>
                      <div className="font-bold text-sm">{res.name}</div>
                      <div className="text-[10px] text-noir-text-muted uppercase">{res.b} • {res.t}</div>
                    </div>
                    {res.g && <Play size={14} className="text-noir-accent" />}
                  </div>
                ))}
              </div>
            )}
            
            {selectedGifUrl && (
              <div className="mt-2 text-[10px] text-noir-accent flex items-center gap-1 font-bold uppercase tracking-wider">
                <Check size={12} /> Animation Attached
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Sets</label>
              <input type="number" value={sets} onChange={e => setSets(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Reps</label>
              <input type="text" value={reps} onChange={e => setReps(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent" placeholder="e.g. 8-10" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Rest (s)</label>
              <input type="number" value={rest} onChange={e => setRest(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-noir-text-muted uppercase mb-2">Scope</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scope === "today"} onChange={() => setScope("today")} className="accent-noir-accent" />
                <span className="text-sm">Today only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scope === "every_week"} onChange={() => setScope("every_week")} className="accent-noir-accent" />
                <span className="text-sm">Every week</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-noir-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-noir-border hover:bg-noir-surface-light font-bold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-noir-accent text-noir-bg hover:opacity-90 active:scale-95 transition-transform font-bold shadow-[0_0_15px_rgba(208,56,243,0.3)]">Add Exercise</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkoutLogger() {
  const { state, addCustomExercise, setCustomDayRoutine } = useProtocol();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditRoutineModalOpen, setIsEditRoutineModalOpen] = useState(false);
  const [routineNameEdit, setRoutineNameEdit] = useState("");
  const [routineFocusEdit, setRoutineFocusEdit] = useState("");
  
  const baseRoutine = ROUTINE_SCHEMA[state.activeDayOfWeek];
  const dateStr = getProtocolDateString(state.activeWeek, state.activeDayOfWeek);

  // Merge custom routines
  let mergedRoutine = baseRoutine;
  if (state.customRoutine?.[state.activeDayOfWeek]) {
    const custom = state.customRoutine[state.activeDayOfWeek];
    if (custom.isPartial && baseRoutine) {
      mergedRoutine = { ...baseRoutine, exercises: [...baseRoutine.exercises, ...custom.exercises] };
    } else {
      mergedRoutine = custom;
    }
  }

  const dailyExtras = state.customDailyExercises?.[dateStr] || [];
  const finalExercises = mergedRoutine ? [...mergedRoutine.exercises, ...dailyExtras] : [...dailyExtras];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <DaySelector />

      {finalExercises.length === 0 ? (
        <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Rest Day</h2>
          <p className="text-noir-text-muted mb-6">Recovery is where growth happens. Focus on hydration, nutrition, and sleep.</p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 border-2 border-dashed border-noir-border rounded-xl text-noir-text-muted hover:text-noir-accent hover:border-noir-accent hover:bg-noir-accent/5 transition-all inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
          >
            + Add Exercise Anyway
          </button>
        </div>
      ) : (
        <>
          <header className="mb-4 px-2 flex justify-between items-end">
            <div>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">{mergedRoutine?.dayName || "Custom Day"}</h2>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">{mergedRoutine?.focus || "Custom Workout"}</h1>
                <button id="tour-edit-routine" onClick={() => {
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

          <div className="space-y-4">
            {finalExercises.map((ex, index) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                activeWeek={state.activeWeek}
                activeDayOfWeek={state.activeDayOfWeek}
                isFinal={index === finalExercises.length - 1}
                dateStr={dateStr}
              />
            ))}
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-noir-border rounded-xl text-noir-text-muted hover:text-noir-accent hover:border-noir-accent hover:bg-noir-accent/5 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
            >
              + Add Exercise
            </button>
          </div>
        </>
      )}
      
      <AddExerciseModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={(ex, scope) => addCustomExercise(ex, scope, state.activeDayOfWeek, dateStr)} 
      />

      <TourGuide />

      {/* Edit Routine Modal */}
      {isEditRoutineModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-noir-bg/80 backdrop-blur-sm">
          <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-noir-accent">Build Custom Routine</h2>
            <p className="text-sm text-noir-text-muted mb-4">{mergedRoutine?.isPartial === false ? "Update the name and focus of your custom day." : "This will clear the current day's protocol exercises and let you build a completely custom day."}</p>
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
                <button type="submit" className={`flex-1 px-4 py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform ${mergedRoutine?.isPartial === false ? "bg-noir-accent text-noir-bg hover:opacity-90" : "bg-red-600/20 text-red-500 border border-red-900 hover:bg-red-600/30"}`}>
                  {mergedRoutine?.isPartial === false ? "Update Custom Day" : <><Trash2 size={16} /> Wipe & Build Custom</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
