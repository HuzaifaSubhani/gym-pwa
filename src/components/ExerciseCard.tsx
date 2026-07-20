"use client";

import { useProtocol, SetLog } from "@/hooks/useProtocolStore";
import { Exercise, getIntensityDirectives } from "@/data/protocol";
import { Check, ChevronLeft, Trash2, History, Play, Info, ChevronDown, Link, Unlink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ExerciseVideoModal from "./ExerciseVideoModal";
import { getProtocolDateString } from "@/lib/dateUtils";

export default function ExerciseCard({ exercise, activeWeek, activeDayOfWeek, isFinal, dateStr, isFuture, allExercises }: {
  exercise: Exercise;
  activeWeek: number;
  activeDayOfWeek: number;
  isFinal: boolean;
  dateStr: string;
  isFuture: boolean;
  allExercises: Exercise[]; // all exercises for superset partner picker
}) {
  const { state, setFullExerciseLogs, removeExercise, startTimer, linkSuperset, unlinkSuperset } = useProtocol();
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
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-save status
  const [isDirty, setIsDirty] = useState(false);

  const isExerciseComplete = localLogs.length > 0 && localLogs.length === exercise.sets && localLogs.every(log => log.weight !== "" && log.reps !== "");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Find active set index (first incomplete set)
  const activeSetIndex = localLogs.findIndex(log => log.weight === "" || log.reps === "");
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

  const handleUpdateLocalLog = (setIndex: number, field: "weight" | "reps" | "rating", value: string) => {
    const newLogs = [...localLogs];
    newLogs[setIndex] = { 
      ...newLogs[setIndex], 
      [field]: value,
      // When user modifies a pulled set, claim it
      isPulled: false,
      isCompleted: (field !== "rating") ? (newLogs[setIndex].weight !== "" && newLogs[setIndex].reps !== "") || value !== "" : newLogs[setIndex].isCompleted,
    };

    // Mark as completed when both weight and reps have values
    if (field !== "rating") {
      const w = field === "weight" ? value : newLogs[setIndex].weight;
      const r = field === "reps" ? value : newLogs[setIndex].reps;
      newLogs[setIndex].isCompleted = w !== "" && r !== "";
    }

    setLocalLogs(newLogs);
    setIsDirty(true);

    if (field !== "rating" && value !== "") {
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

  const handleClear = () => {
    setFullExerciseLogs(dateStr, exercise.id, []);
    setShowClearConfirm(false);
    setIsDirty(false);
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
      if (prevLogs[i] && log.weight === "" && log.reps === "") {
        // Only pre-fill empty sets, and mark them as pulled (ghost data)
        return {
          weight: prevLogs[i].weight || "",
          reps: prevLogs[i].reps || "",
          drops: prevLogs[i].drops ? [...prevLogs[i].drops] : (log.drops ? [...log.drops] : []),
          hasDrops: prevLogs[i].hasDrops || log.hasDrops,
          isPulled: true,     // Mark as ghost data from last week
          isCompleted: false, // NOT completed yet — user needs to claim
        };
      }
      return log; // Don't overwrite sets that already have data
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

  // Determine if exercise has per-exercise drop set config
  const isDropSetExercise = exercise.setType === 'drop';
  const defaultDropCount = exercise.dropConfig?.drops || 2;

  // Scroll to active set when expanded
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

      {/* Set Type Badge + Protocol Note */}
      <div className="absolute top-0 right-0 flex gap-1 z-10">
        {(isDropSetExercise || exercise.setType === 'superset') && (
          <span className={`px-2 py-1 text-[9px] uppercase font-black tracking-widest rounded-bl-lg ${
            exercise.setType === 'drop' 
              ? 'bg-orange-500/20 text-orange-400 border-b border-l border-orange-500/30' 
              : 'bg-blue-500/20 text-blue-400 border-b border-l border-blue-500/30'
          }`}>
            {exercise.setType === 'drop' ? '⬇️ Drop Set' : '🔗 Superset'}
          </span>
        )}
        {(note || exercise.notes) && (
          <div className="bg-noir-surface-light border-b border-l border-noir-border px-3 py-1 text-[10px] uppercase font-bold text-noir-accent tracking-widest rounded-bl-lg max-w-[70%] text-right">
            {note || exercise.notes}
          </div>
        )}
      </div>

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
          {/* Compact progress indicator when collapsed */}
          {!isExpanded && hasAnyData && (
            <div className="flex gap-1.5 mt-2">
              {localLogs.map((log, i) => (
                <div
                  key={i}
                  className={`w-6 h-1.5 rounded-full transition-all ${
                    log.isPulled ? 'bg-yellow-500/40 border border-dashed border-yellow-500/50' 
                    : (log.weight !== "" && log.reps !== "") ? 'bg-noir-accent' 
                    : 'bg-noir-border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="text-noir-text-muted group-hover:text-noir-accent transition-colors self-center p-2">
          {isExpanded ? <ChevronLeft size={20} className="-rotate-90 transition-transform" /> : <ChevronLeft size={20} className="rotate-180 transition-transform" />}
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-300 ease-in-out origin-top ${isExpanded ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden"}`}>
        
        {/* Weight Convention Banner */}
        <div className="flex items-start gap-2 bg-noir-surface-light/50 border border-noir-border/50 rounded-lg p-2.5 mb-3 text-[10px] text-noir-text-muted">
          <Info size={14} className="text-noir-accent shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong className="text-white font-bold">Rule of Iron:</strong> For barbells & machines, log the <strong className="text-noir-accent">Total Weight</strong> (inc. the bar). For dumbbells, log the weight of a <strong className="text-white">Single DB</strong>.
          </p>
        </div>

        {/* Pulled Data Banner */}
        {localLogs.some(l => l.isPulled) && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 mb-3 text-[10px] text-yellow-400 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm">📋</span>
            <p className="leading-tight flex-1">
              <strong className="font-bold">Last week&apos;s data</strong> shown as ghost values. Tap a set to claim it as today&apos;s, or modify the values.
            </p>
            <button
              onClick={() => {
                const cleared = localLogs.map(log => log.isPulled ? { weight: "", reps: "", drops: [] } : log);
                setLocalLogs(cleared);
                setIsDirty(true);
              }}
              className="shrink-0 text-[9px] uppercase font-bold tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
            >
              Clear Pulled
            </button>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {localLogs.map((log, i) => {
            const isActiveSet = i === activeSetIndex && !isFuture;
            const isPulled = !!log.isPulled;
            const showDropInputs = isDropSetExercise || log.hasDrops;
            const dropCount = exercise.dropConfig?.drops || (log.drops?.length || defaultDropCount);

            return (
              <div 
                key={i} 
                ref={isActiveSet ? activeSetRef : null}
                className={`flex flex-col gap-2 p-2 rounded-lg border transition-all ${
                  isPulled 
                    ? 'bg-yellow-500/5 border-dashed border-yellow-500/30' 
                    : isActiveSet 
                      ? 'bg-noir-accent/5 border-noir-accent/40 shadow-[inset_0_0_12px_rgba(204,255,0,0.05)]' 
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
                        className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
                      >
                        📋 Last Week — Tap to Claim
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <span className={`w-6 text-center text-xs font-bold ${
                    isPulled ? 'text-yellow-500/60' : isActiveSet ? 'text-noir-accent' : 'text-noir-text-muted'
                  }`}>S{i + 1}</span>
                  <input
                    type="number"
                    placeholder="kg"
                    disabled={isFuture}
                    className={`w-16 flex-shrink-0 bg-transparent border-b py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px] disabled:opacity-50 transition-colors ${
                      isPulled ? 'border-yellow-500/30 text-yellow-400/70' : 'border-noir-border'
                    }`}
                    value={log.weight}
                    onChange={(e) => handleUpdateLocalLog(i, "weight", e.target.value)}
                  />
                  <span className="text-noir-text-muted">×</span>
                  <input
                    type="number"
                    placeholder="reps"
                    disabled={isFuture}
                    className={`w-16 flex-shrink-0 bg-transparent border-b py-2 px-1 text-center font-mono focus:outline-none focus:border-noir-accent min-h-[44px] disabled:opacity-50 transition-colors ${
                      isPulled ? 'border-yellow-500/30 text-yellow-400/70' : 'border-noir-border'
                    }`}
                    value={log.reps}
                    onChange={(e) => handleUpdateLocalLog(i, "reps", e.target.value)}
                  />
                  <div className="flex gap-1 ml-auto items-center">
                    {/* Per-set drop toggle */}
                    {!isDropSetExercise && (
                      <button
                        onClick={() => handleToggleDropSet(i)}
                        disabled={isFuture}
                        title={log.hasDrops ? "Remove drops" : "Add drops"}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-50 ${
                          log.hasDrops 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500' 
                            : 'bg-noir-surface border border-noir-border text-noir-text-muted hover:text-orange-400'
                        }`}
                      >
                        ⬇
                      </button>
                    )}
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "easy")} 
                      disabled={isFuture}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-50 ${log.rating === 'easy' ? 'bg-green-500/20 text-green-500 border border-green-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted hover:text-green-500'}`}
                    >E</button>
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "hard")} 
                      disabled={isFuture}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-50 ${log.rating === 'hard' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted hover:text-yellow-500'}`}
                    >M</button>
                    <button 
                      onClick={() => handleUpdateLocalLog(i, "rating", "extreme")} 
                      disabled={isFuture}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-50 ${log.rating === 'extreme' ? 'bg-red-500/20 text-red-500 border border-red-500' : 'bg-noir-surface border border-noir-border text-noir-text-muted hover:text-red-500'}`}
                    >H</button>
                  </div>
                </div>

                {prevLogs[i] && prevLogs[i].weight && !isPulled && (
                  <div className="text-[10px] text-noir-text-muted ml-10">
                    Last Week: {prevLogs[i].weight}kg × {prevLogs[i].reps} 
                    {prevLogs[i].rating === 'easy' && ' 🟢 Easy'}
                    {prevLogs[i].rating === 'hard' && ' 🟡 Med'}
                    {prevLogs[i].rating === 'extreme' && ' 🔴 Hard'}
                  </div>
                )}

                {/* Drop set inputs — shown when exercise is drop type OR when user toggled per-set */}
                {showDropInputs && (
                  <div className="mt-2 ml-4 pl-3 border-l-2 border-orange-500/30 space-y-2 relative animate-in fade-in slide-in-from-top-2">
                    <div className="absolute -left-[14px] top-[-10px] w-3 h-4 border-b-2 border-l-2 border-orange-500/30 rounded-bl-md"></div>
                    {Array.from({ length: dropCount }).map((_, di) => (
                      <div key={di} className="flex gap-2 items-center">
                        <span className="w-12 text-[10px] uppercase font-bold text-orange-400 tracking-widest text-right">Drop {di + 1}</span>
                        <input
                          type="number"
                          placeholder="kg"
                          disabled={isFuture}
                          className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-orange-400 min-h-[44px] disabled:opacity-50"
                          value={log.drops?.[di]?.weight || ""}
                          onChange={(e) => handleUpdateDropLog(i, di, "weight", e.target.value)}
                        />
                        <span className="text-noir-text-muted">×</span>
                        <input
                          type="number"
                          placeholder="reps"
                          disabled={isFuture}
                          className="w-16 flex-shrink-0 bg-transparent border-b border-noir-border py-2 px-1 text-center font-mono focus:outline-none focus:border-orange-400 min-h-[44px] disabled:opacity-50"
                          value={log.drops?.[di]?.reps || ""}
                          onChange={(e) => handleUpdateDropLog(i, di, "reps", e.target.value)}
                        />
                      </div>
                    ))}
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
          <div className="flex gap-2 items-center">
            {/* Superset button */}
            {supersetPartnerId ? (
              <button 
                onClick={(e) => { e.stopPropagation(); unlinkSuperset(exercise.id); }}
                className="flex items-center gap-1 p-2 rounded-lg text-blue-400 hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs font-bold uppercase tracking-wider"
                title="Remove superset link"
              >
                <Unlink size={14} /> Unlink
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSupersetPicker(!showSupersetPicker); }}
                className="flex items-center gap-1 p-2 rounded-lg text-noir-text-muted hover:text-blue-400 hover:bg-blue-400/10 transition-colors text-xs font-bold uppercase tracking-wider"
                title="Make superset"
              >
                <Link size={14} /> Superset
              </button>
            )}
            <button onClick={handleDeleteExercise} className="px-3 py-2 rounded-lg bg-noir-bg border border-noir-border text-noir-text-muted hover:text-red-500 hover:border-red-500 transition-colors min-h-[44px] text-xs font-bold uppercase tracking-wider">Remove</button>
            <button onClick={handleCompare} disabled={isFuture || activeWeek <= 1} className="flex items-center gap-1 p-2 rounded-lg text-noir-text-muted hover:text-noir-accent hover:bg-noir-accent/10 transition-colors disabled:opacity-50 text-xs font-bold uppercase tracking-wider"><History size={16} /> Pull</button>
            <button onClick={(e) => { e.stopPropagation(); setShowClearConfirm(true); }} className="p-2 rounded-lg text-noir-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"><Trash2 size={18} /></button>
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
              {allExercises.filter(ex => ex.id !== exercise.id && !state.supersetLinks?.[ex.id]).length === 0 && (
                <p className="text-xs text-noir-text-muted italic py-2">No other exercises available to pair.</p>
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
    </div>
  );
}
