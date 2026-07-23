"use client";

import { useProtocol, SetLog } from "@/hooks/useProtocolStore";
import { Exercise, getIntensityDirectives } from "@/data/protocol";
import { Play, Calculator, Dumbbell, History, Replace, Trash2, Link, Unlink, Plus, Minus, Info, Film, Star, Sparkles, CheckCircle2, ChevronDown, SlidersHorizontal, Target, Flame } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import ExerciseVideoModal from "@/components/modals/ExerciseVideoModal";
import PlateCalculatorModal from "@/components/modals/PlateCalculatorModal";
import { getProtocolDateString } from "@/lib/dateUtils";

export default function ExerciseCard({ exercise, activeWeek, activeDayOfWeek, isFinal, dateStr, isFuture, allExercises, onRemove, onSwap, onSuperset }: {
  exercise: Exercise;
  activeWeek: number;
  activeDayOfWeek: number;
  isFinal: boolean;
  dateStr: string;
  isFuture: boolean;
  allExercises: Exercise[]; // all exercises for superset partner picker
  onRemove?: () => void;
  onSwap?: () => void;
  onSuperset?: (id: string) => void;
}) {
  const state = useProtocol(s => s.state);
  const setFullExerciseLogs = useProtocol(s => s.setFullExerciseLogs);
  const removeExercise = useProtocol(s => s.removeExercise);
  const startTimer = useProtocol(s => s.startTimer);
  const linkSuperset = useProtocol(s => s.linkSuperset);
  const unlinkSuperset = useProtocol(s => s.unlinkSuperset);
  const dayLogs = state.workoutLogs[dateStr] || {};
  const globalExLogs = dayLogs[exercise.id] || [];

  const prevDateStr = activeWeek > 1 ? getProtocolDateString(activeWeek - 1, activeDayOfWeek) : null;
  const prevLogs = prevDateStr ? state.workoutLogs[prevDateStr]?.[exercise.id] || [] : [];

  // Superset state
  const supersetPartnerId = state.supersetLinks?.[exercise.id];
  const supersetPartner = supersetPartnerId ? allExercises.find(e => e.id === supersetPartnerId) : null;
  const [showSupersetPicker, setShowSupersetPicker] = useState(false);

  // Local state for inputs
  const [localLogs, setLocalLogs] = useState<SetLog[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-save status
  const [isDirty, setIsDirty] = useState(false);

  const isExerciseComplete = localLogs.length > 0 && localLogs.length === exercise.sets && localLogs.every(log => log.weight !== "" && log.reps !== "");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [calculatorSetIndex, setCalculatorSetIndex] = useState<number | null>(null);
  const [detailsOpenForSet, setDetailsOpenForSet] = useState<number | null>(null);
  
  // Find active set index (first incomplete set)
  const activeSetIndex = localLogs.findIndex(l => !l.isCompleted && !l.isPulled);
  
  // Calculate estimated 1RM based on Epley formula
  const max1RM = useMemo(() => {
    let max = 0;
    localLogs.forEach(log => {
      const w = parseFloat(log.weight);
      const r = parseInt(log.reps);
      if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
        // Epley formula: 1RM = W * (1 + R/30)
        const est = w * (1 + r / 30);
        if (est > max) max = est;
      }
    });
    return Math.round(max);
  }, [localLogs]);

  const hasAnyData = localLogs.some(log => log.weight !== "" || log.reps !== "");

  // Auto-expand if this exercise has an active set in progress
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (hasAnyData && !isExerciseComplete && !autoExpandedRef.current) {
      setIsExpanded(true);
      autoExpandedRef.current = true;
    }
  }, [hasAnyData, isExerciseComplete]);

  // Sync local state when global state or date changes
  useEffect(() => {
    if (isDirty) return;
    const synced = Array.from({ length: exercise.sets }).map((_, i) => {
      if (globalExLogs[i]) {
        return {
          weight: globalExLogs[i].weight,
          reps: globalExLogs[i].reps,
          drops: globalExLogs[i].drops ? [...globalExLogs[i].drops] : [],
          rating: globalExLogs[i].rating,
          isPulled: globalExLogs[i].isPulled,
          isCompleted: globalExLogs[i].isCompleted,
          hasDrops: globalExLogs[i].hasDrops,
        };
      }
      return { weight: "", reps: "", drops: [] };
    });
    setLocalLogs(synced);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalExLogs?.map(l => `${l?.weight}-${l?.reps}-${l?.isCompleted}-${l?.isPulled}-${l?.drops?.length}`).join('|'), exercise.sets, dateStr]);

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

  const handleUpdateLocalLog = (setIndex: number, field: "weight" | "reps" | "rating" | "form", value: string) => {
    const newLogs = [...localLogs];
    newLogs[setIndex] = { 
      ...newLogs[setIndex], 
      [field]: value,
      isPulled: false,
      isCompleted: (field !== "rating" && field !== "form") ? (newLogs[setIndex].weight !== "" && newLogs[setIndex].reps !== "") || value !== "" : newLogs[setIndex].isCompleted,
    };

    if (field !== "rating" && field !== "form") {
      const w = field === "weight" ? value : newLogs[setIndex].weight;
      const r = field === "reps" ? value : newLogs[setIndex].reps;
      newLogs[setIndex].isCompleted = w !== "" && r !== "";
    }

    setLocalLogs(newLogs);
    setIsDirty(true);

    if (field !== "rating" && field !== "form" && value !== "") {
      const isCompleteNow = newLogs[setIndex].weight !== "" && newLogs[setIndex].reps !== "";
      const wasComplete = localLogs[setIndex].weight !== "" && localLogs[setIndex].reps !== "";
      if (isCompleteNow && !wasComplete) {
        if ('vibrate' in navigator) navigator.vibrate(50);
      }
    }
  };

  const handleUpdateDropLog = (setIndex: number, dropIndex: number, field: "weight" | "reps", value: string) => {
    const newLogs = [...localLogs];
    const drops = [...(newLogs[setIndex].drops || [])];

    while (drops.length <= dropIndex) {
      drops.push({ weight: "", reps: "" });
    }

    drops[dropIndex] = { ...drops[dropIndex], [field]: value };
    newLogs[setIndex] = { ...newLogs[setIndex], drops, isPulled: false };
    setLocalLogs(newLogs);
    setIsDirty(true);
  };

  const handleToggleDropSet = (setIndex: number) => {
    const newLogs = [...localLogs];
    const hasDropsNow = !newLogs[setIndex].hasDrops;
    newLogs[setIndex] = {
      ...newLogs[setIndex],
      hasDrops: hasDropsNow,
      drops: hasDropsNow ? (newLogs[setIndex].drops?.length ? newLogs[setIndex].drops : [{ weight: "", reps: "" }, { weight: "", reps: "" }]) : [],
    };
    setLocalLogs(newLogs);
    setIsDirty(true);
  };

  const handleAddDrop = (setIndex: number) => {
    const newLogs = [...localLogs];
    const drops = [...(newLogs[setIndex].drops || [])];
    
    // Fill to default drop count if empty, then add one more
    const defaultDrops = exercise.dropConfig?.drops || 2;
    while (drops.length < defaultDrops && !newLogs[setIndex].hasDrops && exercise.setType !== 'drop') {
        drops.push({ weight: "", reps: "" });
    }
    
    drops.push({ weight: "", reps: "" });
    newLogs[setIndex] = { ...newLogs[setIndex], drops, hasDrops: true, isPulled: false };
    setLocalLogs(newLogs);
    setIsDirty(true);
  };

  const handleRemoveDrop = (setIndex: number) => {
    const newLogs = [...localLogs];
    const drops = [...(newLogs[setIndex].drops || [])];
    if (drops.length > 1) {
      drops.pop();
      newLogs[setIndex] = { ...newLogs[setIndex], drops, hasDrops: true, isPulled: false };
      setLocalLogs(newLogs);
      setIsDirty(true);
    } else if (drops.length === 1) {
      newLogs[setIndex] = { ...newLogs[setIndex], drops: [], hasDrops: false, isPulled: false };
      setLocalLogs(newLogs);
      setIsDirty(true);
    }
  };

  const handleClear = () => {
    setFullExerciseLogs(dateStr, exercise.id, []);
    setShowClearConfirm(false);
    setIsDirty(false);
  };

  const handleDeleteExercise = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemoveExercise = () => {
    if (onRemove) onRemove();
    else removeExercise(activeDayOfWeek, dateStr, exercise.id);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeWeek <= 1) return;

    const prevDateStr = getProtocolDateString(activeWeek - 1, activeDayOfWeek);
    const prevLogs = state.workoutLogs[prevDateStr]?.[exercise.id] || [];
    if (prevLogs.length === 0) return;

    const mergedLogs = localLogs.map((log, i) => {
      if (prevLogs[i] && log.weight === "" && log.reps === "") {
        return {
          weight: prevLogs[i].weight || "",
          reps: prevLogs[i].reps || "",
          drops: prevLogs[i].drops ? [...prevLogs[i].drops] : (log.drops ? [...log.drops] : []),
          hasDrops: prevLogs[i].hasDrops || log.hasDrops,
          isPulled: true,
          isCompleted: false,
        };
      }
      return log;
    });

    setLocalLogs(mergedLogs);
    setIsDirty(true);
    setIsExpanded(true);
  };

  const handleClaimSet = (setIndex: number) => {
    const newLogs = [...localLogs];
    newLogs[setIndex] = {
      ...newLogs[setIndex],
      isPulled: false,
      isCompleted: newLogs[setIndex].weight !== "" && newLogs[setIndex].reps !== "",
    };
    setLocalLogs(newLogs);
    setIsDirty(true);
  };

  const isDropSetExercise = exercise.setType === 'drop';
  const defaultDropCount = exercise.dropConfig?.drops || 2;

  const activeSetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isExpanded && activeSetRef.current) {
      activeSetRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isExpanded, activeSetIndex]);

  return (
    <div id="tour-exercise-card" className={`bg-noir-surface rounded-xl border p-4 shadow-lg overflow-hidden relative transition-all duration-300 ${
      isExerciseComplete ? "border-noir-accent/70 shadow-[0_0_15px_rgba(208,56,243,0.15)] bg-noir-surface/90"
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

      {showRemoveConfirm && (
        <div className="absolute inset-0 bg-noir-bg/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">Remove {exercise.name}?</h3>
            <p className="text-sm text-noir-text-muted mb-4">Are you sure you want to remove this exercise from today's workout?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(false); }} className="px-4 py-2 rounded-lg border border-noir-border hover:bg-noir-surface-light min-h-[44px] font-bold">Cancel</button>
              <button onClick={(e) => { e.stopPropagation(); confirmRemoveExercise(); }} className="px-4 py-2 rounded-lg bg-red-600/20 text-red-500 border border-red-900 font-bold hover:bg-red-600/30 min-h-[44px]">Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Set Type Badge + Protocol Note */}
      <div className="absolute top-0 right-0 flex gap-1 z-10">
        {(isDropSetExercise || exercise.setType === 'superset') && (
          <span className={`px-2 py-1 text-[9px] uppercase font-black tracking-widest rounded-bl-lg ${
            exercise.setType === 'drop' 
              ? 'bg-orange-500/20 text-orange-400 border-b border-l border-orange-500/30' 
              : 'bg-blue-500/20 text-blue-400 border-b border-l border-blue-500/30'
          }`}>
            {exercise.setType === 'drop' ? 'DS' : '🔗 SUPERSET'}
          </span>
        )}
        {(note || exercise.notes) && (
          <div className="bg-noir-surface-light border-b border-l border-noir-border px-3 py-1 text-[10px] uppercase font-bold text-noir-accent tracking-widest rounded-bl-lg max-w-[70%] text-right whitespace-nowrap">
            {((note || exercise.notes)?.toUpperCase() === 'PROGRESSIVE OVERLOAD DRIVER') ? 'PO' : (note || exercise.notes)}
          </div>
        )}
      </div>

      {/* Header - Clickable to toggle expansion */}
      <div 
        className="mb-2 pr-12 mt-2 cursor-pointer group flex items-start justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg md:text-xl font-bold leading-tight group-hover:text-noir-accent transition-colors flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              {exercise.name}
              {isExerciseComplete && <Check size={18} className="text-noir-accent stroke-[3px]" />}
            </div>
            {exercise.targetMuscle && (
              <div className="text-[10px] sm:ml-2 text-noir-text-muted font-normal tracking-wide uppercase mt-1 sm:mt-0 flex items-center flex-wrap gap-1 leading-tight">
                Target: <span className="text-white bg-noir-bg px-1.5 py-0.5 rounded border border-noir-border/50">{exercise.targetMuscle}</span>
                {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                  <span className="opacity-70 ml-1">
                    (+ {exercise.secondaryMuscles.join(', ')})
                  </span>
                )}
              </div>
            )}
            {max1RM > 0 && (
              <div className="text-[10px] text-noir-accent font-bold tracking-wide mt-1">
                EST 1RM: {max1RM} kg
              </div>
            )}
          </h3>
          <p className="text-xs md:text-sm text-noir-text-muted mt-2 sm:mt-1 flex items-center gap-2">
            {exercise.sets} Sets × {exercise.reps}
            {supersetPartner && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-noir-border"></span>
                <span className="text-blue-400 font-bold">🔗 {supersetPartner.name}</span>
              </>
            )}
            {exercise.gif_url && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-noir-border"></span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsVideoModalOpen(true); }}
                  className="flex items-center gap-1 text-white hover:opacity-80 transition-colors bg-white/10 px-2 py-0.5 rounded border border-white/30"
                >
                  <Play size={12} className="fill-current" /> <span className="uppercase font-bold tracking-wider text-[9px]">Demo</span>
                </button>
              </>
            )}
          </p>
          {/* Compact progress indicator when collapsed (Hollow when empty) */}
          {!isExpanded && hasAnyData && (
            <div className="flex gap-1.5 mt-2">
              {localLogs.map((log, i) => {
                const isDone = log.weight !== "" && log.reps !== "";
                return (
                  <div
                    key={i}
                    className={`w-6 h-1.5 rounded-full transition-all ${
                      log.isPulled ? 'bg-yellow-500/40 border border-dashed border-yellow-500/50' 
                      : isDone ? 'bg-noir-accent border border-noir-accent' 
                      : 'bg-transparent border border-noir-border'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="text-noir-text-muted group-hover:text-noir-accent transition-colors self-center p-2">
          {isExpanded ? <ChevronLeft size={20} className="-rotate-90 transition-transform" /> : <ChevronLeft size={20} className="rotate-180 transition-transform" />}
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-300 ease-in-out origin-top ${isExpanded ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden"}`}>
        
        {/* Pulled Data Banner (Condsensed) */}
        {localLogs.some(l => l.isPulled) && (
          <div className="flex items-center justify-between gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3 text-xs text-yellow-400 animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-2 font-bold"><History size={14}/> Last week's data pulled.</span>
            <button
              onClick={() => {
                const cleared = localLogs.map(log => log.isPulled ? { weight: "", reps: "", drops: [] } : log);
                setLocalLogs(cleared);
                setIsDirty(true);
              }}
              className="text-[10px] uppercase font-bold tracking-widest text-yellow-500 hover:text-yellow-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {localLogs.map((log, i) => {
            const isActiveSet = i === activeSetIndex && !isFuture;
            const isPulled = !!log.isPulled;
            const showDropInputs = isDropSetExercise || log.hasDrops;
            const dropCount = log.drops?.length || (isDropSetExercise ? defaultDropCount : 0);

            return (
              <div 
                key={i} 
                ref={isActiveSet ? activeSetRef : null}
                className={`flex flex-col gap-2 p-2 rounded-lg border transition-all ${
                  isPulled 
                    ? 'bg-yellow-500/5 border-dashed border-yellow-500/30' 
                    : isActiveSet 
                      ? 'bg-noir-accent/5 border-noir-accent' 
                      : 'bg-noir-bg border-transparent focus-within:border-noir-border'
                }`}
              >
                {/* Active Set / Pulled Indicator */}
                {(isActiveSet || isPulled) && (
                  <div className="flex items-center gap-2 mb-1">
                    {isActiveSet && !isPulled && (
                      <span className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-noir-accent">
                        <span className="w-1.5 h-1.5 rounded-full bg-noir-accent animate-pulse"></span>
                        Current Set
                      </span>
                    )}
                    {isPulled && (
                      <button
                        onClick={() => handleClaimSet(i)}
                        className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        Tap to Claim
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-1.5 sm:gap-2 items-center">
                  <span className={`w-5 text-center text-xs font-bold ${
                    isPulled ? 'text-yellow-500/60' : isActiveSet ? 'text-noir-accent' : 'text-noir-text-muted'
                  }`}>S{i + 1}</span>
                  <input
                    type="number"
                    placeholder="kg"
                    disabled={isFuture}
                    className={`w-12 sm:w-14 flex-shrink-0 bg-transparent border-b py-2 px-0.5 sm:px-1 text-center font-mono text-sm focus:outline-none focus:border-noir-accent min-h-[44px] disabled:opacity-50 transition-colors ${
                      isPulled ? 'border-yellow-500/30 text-yellow-400/70' : 'border-noir-border'
                    }`}
                    value={log.weight}
                    onChange={(e) => handleUpdateLocalLog(i, "weight", e.target.value)}
                  />
                  <span className="text-noir-text-muted text-xs">×</span>
                  <input
                    type="number"
                    placeholder="reps"
                    disabled={isFuture}
                    className={`w-12 sm:w-14 flex-shrink-0 bg-transparent border-b py-2 px-0.5 sm:px-1 text-center font-mono text-sm focus:outline-none focus:border-noir-accent min-h-[44px] disabled:opacity-50 transition-colors ${
                      isPulled ? 'border-yellow-500/30 text-yellow-400/70' : 'border-noir-border'
                    }`}
                    value={log.reps}
                    onChange={(e) => handleUpdateLocalLog(i, "reps", e.target.value)}
                  />
                  
                  <button
                    onClick={() => setCalculatorSetIndex(i)}
                    disabled={isFuture}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-noir-text-muted hover:text-noir-accent hover:bg-noir-surface-light transition-colors disabled:opacity-50"
                    title="Open Plate Calculator"
                  >
                    <Calculator size={14} />
                  </button>

                  <div className="flex gap-2 ml-auto items-center">
                    {/* Per-set drop toggle */}
                    {!isDropSetExercise && (
                      <button
                        onClick={() => handleToggleDropSet(i)}
                        disabled={isFuture}
                        title={log.hasDrops ? "Remove drops" : "Add drops"}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-50 ${
                          log.hasDrops 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500' 
                            : 'bg-zinc-800 border border-zinc-700 text-noir-text-muted hover:text-orange-400'
                        }`}
                      >
                        ⬇
                      </button>
                    )}
                    <button 
                      onClick={() => setDetailsOpenForSet(detailsOpenForSet === i ? null : i)}
                      disabled={isFuture}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                        detailsOpenForSet === i || log.rating || log.form
                          ? 'bg-noir-accent text-black border border-noir-accent' 
                          : 'bg-zinc-800 border border-zinc-700 text-noir-text-muted hover:text-white'
                      }`}
                      title="Set Details"
                    >
                      <SlidersHorizontal size={12} />
                    </button>
                  </div>
                </div>

                {prevLogs[i] && prevLogs[i].weight && !isPulled && (
                  <div className="text-[10px] text-noir-text-muted ml-8 truncate mt-1">
                    Prev: {prevLogs[i].weight}kg × {prevLogs[i].reps} 
                  </div>
                )}

                {/* Set Details Drawer */}
                {detailsOpenForSet === i && (
                  <div className="mt-3 ml-1 sm:ml-2 pl-3 border-l-2 border-noir-accent/30 space-y-4 relative animate-in fade-in slide-in-from-top-2 pb-2">
                    <div className="absolute -left-[14px] top-[-10px] w-3 h-4 border-b-2 border-l-2 border-noir-accent/30 rounded-bl-md"></div>
                    
                    {/* Difficulty (RPE) */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Flame size={12} className="text-orange-500" />
                        <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-widest">Difficulty</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateLocalLog(i, "rating", "easy")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.rating === 'easy' ? 'bg-green-500/20 text-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Easy</button>
                        <button onClick={() => handleUpdateLocalLog(i, "rating", "hard")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.rating === 'hard' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Medium</button>
                        <button onClick={() => handleUpdateLocalLog(i, "rating", "extreme")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.rating === 'extreme' ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Hard</button>
                      </div>
                    </div>

                    {/* Form Quality */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target size={12} className="text-blue-500" />
                        <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-widest">Form Level</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateLocalLog(i, "form", "poor")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.form === 'poor' ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Poor</button>
                        <button onClick={() => handleUpdateLocalLog(i, "form", "avg")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.form === 'avg' ? 'bg-blue-500/20 text-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Avg</button>
                        <button onClick={() => handleUpdateLocalLog(i, "form", "good")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${log.form === 'good' ? 'bg-[#CCFF00]/20 text-[#CCFF00] border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Good</button>
                        <button onClick={() => handleUpdateLocalLog(i, "form", "perfect")} className={`flex-1 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border ${log.form === 'perfect' ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>Perfect</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drop set inputs */}
                {showDropInputs && (
                  <div className="mt-2 ml-3 sm:ml-4 pl-3 border-l-2 border-orange-500/30 space-y-2 relative animate-in fade-in slide-in-from-top-2">
                    <div className="absolute -left-[14px] top-[-10px] w-3 h-4 border-b-2 border-l-2 border-orange-500/30 rounded-bl-md"></div>
                    {Array.from({ length: dropCount }).map((_, di) => (
                      <div key={di} className="flex gap-2 items-center">
                        <span className="w-10 text-[9px] sm:text-[10px] uppercase font-bold text-orange-400 tracking-widest text-right">Drop {di + 1}</span>
                        <input
                          type="number"
                          placeholder="kg"
                          disabled={isFuture}
                          className="w-12 sm:w-14 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono text-sm focus:outline-none focus:border-orange-400 min-h-[44px] disabled:opacity-50"
                          value={log.drops?.[di]?.weight || ""}
                          onChange={(e) => handleUpdateDropLog(i, di, "weight", e.target.value)}
                        />
                        <span className="text-noir-text-muted text-xs">×</span>
                        <input
                          type="number"
                          placeholder="reps"
                          disabled={isFuture}
                          className="w-12 sm:w-14 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono text-sm focus:outline-none focus:border-orange-400 min-h-[44px] disabled:opacity-50"
                          value={log.drops?.[di]?.reps || ""}
                          onChange={(e) => handleUpdateDropLog(i, di, "reps", e.target.value)}
                        />
                      </div>
                    ))}
                    {/* Add / Remove Drops Dynamically */}
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => handleAddDrop(i)} disabled={isFuture} className="p-1 px-2 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold border border-orange-500/30 flex items-center gap-1 hover:bg-orange-500/20 transition-colors disabled:opacity-50">
                        <Plus size={10} /> Drop
                      </button>
                      <button onClick={() => handleRemoveDrop(i)} disabled={isFuture || dropCount === 0} className="p-1 px-2 rounded bg-noir-surface text-noir-text-muted text-[10px] font-bold border border-noir-border flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50">
                        <Minus size={10} /> Drop
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-noir-border justify-between">
          <button 
            onClick={(e) => { e.stopPropagation(); startTimer(effectiveRest); }} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[10px] font-bold text-noir-accent uppercase tracking-wider hover:opacity-80 transition-colors bg-noir-accent/10 px-3 py-2 rounded-lg border border-noir-accent/30"
          >
            Rest {effectiveRest}s
          </button>
          <div className="flex gap-2 items-center flex-1 justify-end">
            {/* Superset button */}
            {supersetPartnerId ? (
              <button 
                onClick={(e) => { e.stopPropagation(); unlinkSuperset(exercise.id); }}
                className="flex items-center justify-center p-2 rounded-lg text-blue-400 hover:text-red-400 hover:bg-red-400/10 transition-colors text-[10px] font-bold uppercase tracking-wider bg-noir-bg border border-noir-border"
                title="Remove superset"
              >
                <Unlink size={14} className="mr-1" /> <span>Unlink</span>
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSupersetPicker(!showSupersetPicker); }}
                className="flex items-center justify-center p-2 rounded-lg text-noir-text-muted hover:text-blue-400 hover:bg-blue-400/10 transition-colors text-[10px] font-bold uppercase tracking-wider bg-noir-bg border border-noir-border"
                title="Make superset"
              >
                <Link size={14} className="mr-1" /> <span>Superset</span>
              </button>
            )}
            
            <button onClick={handleCompare} disabled={isFuture || activeWeek <= 1} className="flex items-center justify-center p-2 rounded-lg text-noir-text-muted hover:text-noir-accent hover:bg-noir-accent/10 transition-colors disabled:opacity-50 text-[10px] font-bold uppercase tracking-wider bg-noir-bg border border-noir-border" title="Pull last week">
              <History size={14} className="sm:mr-1" /> <span className="hidden sm:inline">Pull</span>
            </button>
            <button onClick={onSwap} className="flex items-center justify-center p-2 rounded-lg text-noir-text-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors min-h-[36px] text-[10px] font-bold uppercase tracking-wider bg-noir-bg border border-noir-border" title="Swap exercise">
              <Replace size={14} className="sm:mr-1" /> <span className="hidden sm:inline">Swap</span>
            </button>
            <button onClick={handleDeleteExercise} className="flex items-center justify-center p-2 rounded-lg text-noir-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors min-h-[36px] text-[10px] font-bold uppercase tracking-wider bg-noir-bg border border-noir-border" title="Remove exercise">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Superset Partner Picker */}
        {showSupersetPicker && (
          <div className="mt-3 p-3 bg-noir-bg border border-blue-400/30 rounded-xl animate-in fade-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Pick Superset Partner</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {allExercises
                .filter(ex => ex.id !== exercise.id && !state.supersetLinks?.[ex.id])
                .map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      linkSuperset(exercise.id, ex.id);
                      setShowSupersetPicker(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-noir-border hover:border-blue-400 hover:bg-blue-400/5 transition-colors text-sm font-bold"
                  >
                    {ex.name}
                  </button>
                ))
              }
              {allExercises.filter(ex => ex.id !== exercise.id && !state.supersetLinks?.[ex.id]).length === 0 ? (
                <p className="text-xs text-noir-text-muted italic py-2">To superset, add another exercise to today's workout first.</p>
              ) : (
                <p className="text-[10px] text-noir-text-muted italic py-1 border-t border-noir-border mt-2 pt-2">Don't see your exercise? Add it to today's workout first.</p>
              )}
            </div>
            <button
              onClick={() => setShowSupersetPicker(false)}
              className="mt-2 w-full text-center py-2 text-xs font-bold text-noir-text-muted uppercase tracking-widest border border-noir-border rounded-lg hover:bg-noir-surface-light transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {exercise.gif_url && (
        <ExerciseVideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={exercise.gif_url}
          exerciseName={exercise.name}
        />
      )}
      
      <PlateCalculatorModal
        isOpen={calculatorSetIndex !== null}
        onClose={() => setCalculatorSetIndex(null)}
        initialWeight={calculatorSetIndex !== null ? localLogs[calculatorSetIndex].weight : ""}
        onApplyWeight={(w) => {
          if (calculatorSetIndex !== null) {
            handleUpdateLocalLog(calculatorSetIndex, "weight", w);
          }
        }}
      />
    </div>
  );
}
