"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { TrendingUp, TrendingDown, Minus, Activity, CheckCircle2, Dumbbell, CalendarCheck } from "lucide-react";
import { useMemo } from "react";

export default function ProgressAnalytics() {
  const { state } = useProtocol();
  
  const analyticsData = useMemo(() => {
    const primaryLifts = [
      { id: "m1", name: "Incline DB Press", muscle: "Upper Chest" },
      { id: "t1", name: "Pull-ups / Pulldown", muscle: "Lats" },
      { id: "w1", name: "Hack Squat", muscle: "Quads" },
      { id: "th1", name: "Smith Machine Press", muscle: "Shoulders" },
      { id: "f1", name: "Split Squats", muscle: "Legs" },
    ];

    const sortedDates = Object.keys(state.workoutLogs).sort();
    
    return primaryLifts.map(lift => {
      const datesPerfomed = sortedDates.filter(d => state.workoutLogs[d]?.[lift.id]?.some(s => s.weight));
      
      if (datesPerfomed.length === 0) return { ...lift, status: "no_data", lastMaxWeight: 0, prevMaxWeight: 0 };
      if (datesPerfomed.length === 1) {
        const lastDate = datesPerfomed[0];
        const lastSets = state.workoutLogs[lastDate][lift.id];
        const lastMaxWeight = Math.max(...lastSets.map(s => parseFloat(s.weight) || 0));
        return { ...lift, status: "baseline", lastMaxWeight, prevMaxWeight: 0 };
      }
      
      const lastDate = datesPerfomed[datesPerfomed.length - 1];
      const prevDate = datesPerfomed[datesPerfomed.length - 2];
      
      const lastSets = state.workoutLogs[lastDate][lift.id];
      const prevSets = state.workoutLogs[prevDate][lift.id];
      
      const lastMaxWeight = Math.max(...lastSets.map(s => parseFloat(s.weight) || 0));
      const prevMaxWeight = Math.max(...prevSets.map(s => parseFloat(s.weight) || 0));
      
      let status = "maintained";
      if (lastMaxWeight > prevMaxWeight) status = "progressed";
      if (lastMaxWeight < prevMaxWeight) status = "regressed";
      
      return {
        ...lift,
        lastMaxWeight,
        prevMaxWeight,
        status
      };
    });
  }, [state.workoutLogs]);

  // Compute overall stats
  const stats = useMemo(() => {
    const sortedDates = Object.keys(state.workoutLogs);
    let totalWorkouts = 0;
    let totalSetsLogged = 0;
    
    sortedDates.forEach(date => {
      const dayData = state.workoutLogs[date];
      let hasLoggedSomething = false;
      Object.keys(dayData).forEach(exId => {
        const exLogs = dayData[exId];
        const validSets = exLogs.filter(s => s.weight && s.reps).length;
        if (validSets > 0) {
          hasLoggedSomething = true;
          totalSetsLogged += validSets;
        }
      });
      if (hasLoggedSomething) totalWorkouts++;
    });

    return { totalWorkouts, totalSetsLogged };
  }, [state.workoutLogs]);

  return (
    <div className="space-y-8">
      {/* Cumulative Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg flex flex-col justify-center items-center text-center">
          <CalendarCheck className="text-noir-accent mb-2" size={24} />
          <span className="text-3xl font-black">{stats.totalWorkouts}</span>
          <span className="text-[10px] uppercase tracking-widest text-noir-text-muted mt-1 font-bold">Workouts</span>
        </div>
        <div className="bg-noir-surface rounded-xl border border-noir-border p-4 shadow-lg flex flex-col justify-center items-center text-center">
          <Dumbbell className="text-noir-accent mb-2" size={24} />
          <span className="text-3xl font-black">{stats.totalSetsLogged}</span>
          <span className="text-[10px] uppercase tracking-widest text-noir-text-muted mt-1 font-bold">Sets Logged</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analyticsData.map(data => (
          <div key={data.id} className="bg-noir-surface rounded-xl border border-noir-border p-5 shadow-lg relative overflow-hidden group hover:border-noir-accent transition-colors">
            
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-noir-accent/5 rounded-full blur-2xl group-hover:bg-noir-accent/10 transition-colors"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg leading-tight">{data.name}</h3>
                <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{data.muscle}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-noir-bg flex items-center justify-center border border-noir-border">
                {data.status === "progressed" && <TrendingUp className="text-noir-accent" size={20} />}
                {data.status === "regressed" && <TrendingDown className="text-red-500" size={20} />}
                {data.status === "maintained" && <Minus className="text-noir-text-muted" size={20} />}
                {data.status === "baseline" && <Activity className="text-noir-accent" size={20} />}
                {data.status === "no_data" && <Minus className="text-noir-border" size={20} />}
              </div>
            </div>

            <div className="flex items-end gap-3 mt-6">
              {data.status === "no_data" ? (
                <p className="text-sm text-noir-text-muted">Awaiting first log...</p>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-noir-text-muted uppercase tracking-wider mb-1">Current Max</span>
                    <span className="text-3xl font-black">{data.lastMaxWeight}<span className="text-sm text-noir-text-muted ml-1">kg</span></span>
                  </div>
                  
                  {data.prevMaxWeight > 0 && (
                    <div className="flex flex-col ml-4 opacity-50">
                      <span className="text-[10px] text-noir-text-muted uppercase tracking-wider mb-1">Previous</span>
                      <span className="text-xl font-bold">{data.prevMaxWeight}<span className="text-xs ml-1">kg</span></span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
