"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import exercisesData from "@/data/exercises.json";
import { Dumbbell, Activity, CalendarDays, ChevronRight } from "lucide-react";

export default function WorkoutHistory() {
  const state = useProtocol(s => s.state);

  const getLogSummary = (dateStr: string) => {
    const logs = state.workoutLogs[dateStr];
    if (!logs || Object.keys(logs).length === 0) return null;

    let totalVolume = 0;
    let totalSets = 0;
    let exerciseCount = Object.keys(logs).length;

    Object.values(logs).forEach(exLogs => {
      exLogs.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (weight > 0 && reps > 0) {
          totalVolume += weight * reps;
          totalSets += 1;
        }
        if (set.drops) {
          set.drops.forEach(drop => {
            const dw = parseFloat(drop.weight) || 0;
            const dr = parseInt(drop.reps) || 0;
            if (dw > 0 && dr > 0) {
              totalVolume += dw * dr;
              totalSets += 1;
            }
          });
        }
      });
    });

    if (totalSets === 0) return null;
    return { totalVolume, totalSets, exerciseCount, logs };
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const loggedDates = Object.keys(state.workoutLogs)
    .filter(dateStr => dateStr <= todayStr && getLogSummary(dateStr) !== null)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Your Journey</h2>
        <h1 className="text-3xl font-black flex items-center gap-3">
          History <CalendarDays className="text-noir-accent" size={28} />
        </h1>
      </header>

      {loggedDates.length === 0 ? (
        <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border shadow-lg">
          <p className="text-noir-text-muted">No workouts logged yet. Your journey begins today!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loggedDates.map(dateStr => {
            const summary = getLogSummary(dateStr);
            if (!summary) return null;

            const dateObj = new Date(dateStr);
            const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            return (
              <div key={dateStr} className="bg-noir-surface border border-noir-border rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-lg font-black text-white">{dateDisplay}</h3>
                    <p className="text-xs text-noir-accent uppercase tracking-widest font-bold mt-1">
                      {summary.exerciseCount} Exercises • {summary.totalSets} Sets
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-white">{summary.totalVolume.toLocaleString()}</span>
                    <span className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold">Total Vol (kg)</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-noir-border/50">
                  {Object.entries(summary.logs).map(([exId, sets]) => {
                    const exName = exercisesData.find((e: any) => e.id === exId)?.name || "Unknown Exercise";
                    const validSets = sets.filter(s => parseFloat(s.weight) > 0 && parseInt(s.reps) > 0);
                    if (validSets.length === 0) return null;

                    return (
                      <div key={exId} className="flex justify-between items-center bg-noir-bg/50 rounded-lg px-3 py-2 border border-noir-border/30">
                        <span className="text-sm font-bold text-white line-clamp-1 flex-1 pr-2">{exName}</span>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs text-noir-text-muted font-mono">
                            {validSets.length} sets
                          </span>
                          <span className="text-xs text-noir-accent font-bold">
                            {Math.max(...validSets.map(s => parseFloat(s.weight) || 0))}kg max
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
