"use client";

import { useProtocol, SetLog } from "@/hooks/useProtocolStore";
import { CompoundGroup } from "@/data/protocol";
import { Check, Trash2, RefreshCw, Play, Info } from "lucide-react";
import { useState, useEffect } from "react";

export default function CompoundSetCard({ group, dateStr, isFuture }: {
  group: CompoundGroup;
  dateStr: string;
  isFuture: boolean;
}) {
  const state = useProtocol(s => s.state);
  const setFullExerciseLogs = useProtocol(s => s.setFullExerciseLogs);
  const removeCompoundGroup = useProtocol(s => s.removeCompoundGroup);
  const startTimer = useProtocol(s => s.startTimer);

  // Each exercise in the group has its own logs, keyed by exerciseId
  // For each round, we use setIndex = roundIndex within each exercise's logs
  const [localRoundLogs, setLocalRoundLogs] = useState<Record<string, SetLog[]>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync from global state
  useEffect(() => {
    if (isDirty) return;
    const dayLogs = state.workoutLogs[dateStr] || {};
    const synced: Record<string, SetLog[]> = {};
    for (const ex of group.exercises) {
      const globalLogs = dayLogs[ex.id] || [];
      synced[ex.id] = Array.from({ length: group.rounds }).map((_, i) => {
        if (globalLogs[i]) {
          return { weight: globalLogs[i].weight, reps: globalLogs[i].reps };
        }
        return { weight: "", reps: "" };
      });
    }
    setLocalRoundLogs(synced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, group.id, isDirty]);

  // Auto-save
  useEffect(() => {
    if (!isDirty) return;
    const timeout = setTimeout(() => {
      for (const ex of group.exercises) {
        setFullExerciseLogs(dateStr, ex.id, localRoundLogs[ex.id] || []);
      }
      setIsDirty(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localRoundLogs, isDirty, dateStr, group.exercises, setFullExerciseLogs]);

  const handleUpdate = (exerciseId: string, roundIndex: number, field: "weight" | "reps", value: string) => {
    setLocalRoundLogs(prev => {
      const exLogs = [...(prev[exerciseId] || [])];
      while (exLogs.length <= roundIndex) exLogs.push({ weight: "", reps: "" });
      exLogs[roundIndex] = { ...exLogs[roundIndex], [field]: value };
      return { ...prev, [exerciseId]: exLogs };
    });
    setIsDirty(true);
  };

  const allComplete = group.exercises.every(ex => {
    const logs = localRoundLogs[ex.id] || [];
    return logs.length >= group.rounds && logs.every(l => l.weight !== "" && l.reps !== "");
  });

  // Find current round (first round with any incomplete exercise)
  let activeRound = -1;
  for (let r = 0; r < group.rounds; r++) {
    const roundComplete = group.exercises.every(ex => {
      const log = (localRoundLogs[ex.id] || [])[r];
      return log && log.weight !== "" && log.reps !== "";
    });
    if (!roundComplete) {
      activeRound = r;
      break;
    }
  }

  return (
    <div className={`bg-noir-surface rounded-xl border p-4 shadow-lg overflow-hidden relative transition-all duration-300 ${
      allComplete 
        ? "border-noir-accent/70 shadow-[0_0_15px_rgba(208,56,243,0.15)]" 
        : "border-purple-500/30"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg">
              🔄 Giant Set
            </span>
            {allComplete && <Check size={16} className="text-noir-accent stroke-[3px]" />}
          </div>
          <h3 
            className="text-lg font-bold leading-tight cursor-pointer hover:text-noir-accent transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {group.name}
          </h3>
          <p className="text-xs text-noir-text-muted mt-1">
            {group.exercises.length} exercises × {group.rounds} rounds • {group.rest}s rest between rounds
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm(`Remove giant set "${group.name}"?`)) {
              removeCompoundGroup(dateStr, group.id);
            }
          }}
          className="p-2 text-noir-text-muted hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Weight Convention */}
          <div className="flex items-start gap-2 bg-noir-surface-light/50 border border-noir-border/50 rounded-lg p-2 text-[10px] text-noir-text-muted">
            <Info size={12} className="text-purple-400 shrink-0 mt-0.5" />
            <p>Log weight & reps for each exercise in each round. Complete all exercises → rest → next round.</p>
          </div>

          {Array.from({ length: group.rounds }).map((_, roundIdx) => {
            const isActive = roundIdx === activeRound && !isFuture;
            const roundComplete = group.exercises.every(ex => {
              const log = (localRoundLogs[ex.id] || [])[roundIdx];
              return log && log.weight !== "" && log.reps !== "";
            });

            return (
              <div 
                key={roundIdx} 
                className={`rounded-xl border p-3 space-y-2 transition-all ${
                  roundComplete 
                    ? 'border-noir-accent/30 bg-noir-accent/5' 
                    : isActive 
                      ? 'border-purple-500/40 bg-purple-500/5 shadow-[inset_0_0_12px_rgba(168,85,247,0.05)]' 
                      : 'border-noir-border bg-noir-bg'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase font-black tracking-widest ${
                    roundComplete ? 'text-noir-accent' : isActive ? 'text-purple-400' : 'text-noir-text-muted'
                  }`}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block mr-1"></span>}
                    Round {roundIdx + 1}
                  </span>
                  {roundComplete && <Check size={12} className="text-noir-accent" />}
                </div>

                {group.exercises.map(ex => {
                  const log = (localRoundLogs[ex.id] || [])[roundIdx] || { weight: "", reps: "" };
                  return (
                    <div key={ex.id} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-noir-text-muted truncate w-28 shrink-0" title={ex.name}>
                        {ex.name}
                      </span>
                      <input
                        type="number"
                        placeholder="kg"
                        disabled={isFuture}
                        className="w-14 bg-transparent border-b border-noir-border py-1.5 px-1 text-center font-mono text-sm focus:outline-none focus:border-purple-400 min-h-[36px] disabled:opacity-50"
                        value={log.weight}
                        onChange={(e) => handleUpdate(ex.id, roundIdx, "weight", e.target.value)}
                      />
                      <span className="text-noir-text-muted text-xs">×</span>
                      <input
                        type="number"
                        placeholder="reps"
                        disabled={isFuture}
                        className="w-14 bg-transparent border-b border-noir-border py-1.5 px-1 text-center font-mono text-sm focus:outline-none focus:border-purple-400 min-h-[36px] disabled:opacity-50"
                        value={log.reps}
                        onChange={(e) => handleUpdate(ex.id, roundIdx, "reps", e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Start Rest Button */}
          <button 
            onClick={() => startTimer(group.rest)}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-3 py-2.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
          >
            <RefreshCw size={14} /> Start {group.rest}s Rest Between Rounds
          </button>
        </div>
      )}
    </div>
  );
}
