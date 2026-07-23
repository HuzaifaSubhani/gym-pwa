"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Dumbbell, CalendarCheck, Plus, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { getProtocolDateString, calculateTotalStats } from "@/lib/dateUtils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ProgressAnalytics() {
  const state = useProtocol(s => s.state);
  const addTrackedLift = useProtocol(s => s.addTrackedLift);
  const removeTrackedLift = useProtocol(s => s.removeTrackedLift);
  const [activeTab, setActiveTab] = useState<"summary" | "charts">("charts");
  const [isAddTrackerOpen, setIsAddTrackerOpen] = useState(false);
  
  // Fallback to default if trackedLifts somehow isn't initialized yet
  const trackedLifts = state.trackedLifts || [
    { id: "m1", name: "Incline DB Press", muscle: "Upper Chest", color: "#CCFF00" },
    { id: "t1", name: "Pull-ups / Pulldown", muscle: "Lats", color: "#CCFF00" },
    { id: "w1", name: "Hack Squat", muscle: "Quads", color: "#CCFF00" },
    { id: "th1", name: "Smith Machine Press", muscle: "Shoulders", color: "#CCFF00" },
    { id: "f1", name: "Split Squats", muscle: "Legs", color: "#CCFF00" },
  ];

  const availableExercisesToTrack = useMemo(() => {
    const exMap = new Map<string, { id: string, name: string }>();
    
    // Map all known exercises from active program
    const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
    Object.values(activeProgram.routine_schema).forEach(day => {
      day.exercises.forEach(ex => exMap.set(ex.id, { id: ex.id, name: ex.name }));
    });
    
    // Map custom routines
    if (state.customRoutine) {
      Object.values(state.customRoutine).forEach((day: any) => {
        day.exercises?.forEach((ex: any) => exMap.set(ex.id, { id: ex.id, name: ex.name }));
      });
    }
    
    // Map custom daily exercises
    if (state.customDailyExercises) {
      Object.values(state.customDailyExercises).forEach((dayExs: any[]) => {
        dayExs.forEach(ex => exMap.set(ex.id, { id: ex.id, name: ex.name }));
      });
    }
  
    // Filter out already tracked
    return Array.from(exMap.values()).filter(ex => !trackedLifts.find(l => l.id === ex.id));
  }, [state.customRoutine, state.customDailyExercises, trackedLifts]);

  const stats = useMemo(() => {
    const { totalWorkouts, totalSets: totalSetsLogged } = calculateTotalStats(state.workoutLogs);
    return { totalWorkouts, totalSetsLogged };
  }, [state.workoutLogs]);

  // Compute PRs
  const personalRecords = useMemo(() => {
    const prs: Record<string, { weight: number, reps: number, date: string, name: string }> = {};
    const exMap = new Map<string, string>();
    const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
    Object.values(activeProgram.routine_schema).forEach(day => day.exercises.forEach(ex => exMap.set(ex.id, ex.name)));
    if (state.customRoutine) Object.values(state.customRoutine).forEach((day: any) => day.exercises?.forEach((ex: any) => exMap.set(ex.id, ex.name)));
    if (state.customDailyExercises) Object.values(state.customDailyExercises).forEach((dayExs: any[]) => dayExs.forEach(ex => exMap.set(ex.id, ex.name)));

    Object.entries(state.workoutLogs).forEach(([dateStr, dayLogs]) => {
      Object.entries(dayLogs).forEach(([exId, logs]) => {
        logs.forEach(log => {
          const w = parseFloat(log.weight);
          const r = parseInt(log.reps, 10);
          if (!isNaN(w) && !isNaN(r)) {
            if (!prs[exId] || w > prs[exId].weight || (w === prs[exId].weight && r > prs[exId].reps)) {
              prs[exId] = { weight: w, reps: r, date: dateStr, name: exMap.get(exId) || "Unknown Lift" };
            }
          }
        });
      });
    });
    
    return Object.values(prs).sort((a, b) => b.weight - a.weight).slice(0, 3);
  }, [state.workoutLogs, state.customRoutine, state.customDailyExercises]);

  // Generate chart data series
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayMs = today.getTime();

    const sortedDates = Object.keys(state.workoutLogs).sort().filter(dateStr => {
      const d = new Date(dateStr);
      return d.getTime() <= todayMs;
    });
    
    // Group by week (using the state.activeWeek is not historical, we need to map dateStr to week/day)
    // For simplicity, we will just use dateStr as the X-axis for each lift, 
    // or group by Week X Day Y. Since they perform the lift once a week, each log is a data point.
    
    const seriesData = trackedLifts.map(lift => {
      const dataPoints: any[] = [];
      
      sortedDates.forEach((dateStr, index) => {
        const logs = state.workoutLogs[dateStr]?.[lift.id];
        if (logs && logs.some(s => s.weight && s.reps)) {
          // Calculate Estimated 1RM or simply max weight or total volume
          // Let's plot Max Weight for simplicity and clarity
          const maxWeight = Math.max(...logs.map(s => parseFloat(s.weight) || 0));
          
          // Formatter for date: 'Jul 6'
          const d = new Date(dateStr);
          const shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          
          dataPoints.push({
            date: shortDate,
            weight: maxWeight,
            rawDate: dateStr
          });
        }
      });
      
      return {
        ...lift,
        data: dataPoints
      };
    });

    return seriesData;
  }, [state.workoutLogs, trackedLifts]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Analytics</h2>
        <h1 className="text-3xl font-black">Progress</h1>
      </header>

      {/* Personal Records Section */}
      {personalRecords.length > 0 && (
        <div className="mb-8 relative p-6 bg-noir-surface border border-[#CCFF00]/40 rounded-2xl shadow-lg overflow-hidden">
          
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Trophy className="text-[#CCFF00]" size={24} />
            <h3 className="text-xl font-black uppercase tracking-wider text-white">All-Time PRs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {personalRecords.map((pr, idx) => {
              const d = new Date(pr.date);
              const shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div key={idx} className="bg-noir-bg/60 backdrop-blur-sm border border-[#CCFF00]/20 rounded-xl p-4 flex flex-col items-center text-center shadow-inner">
                  <span className="text-[#CCFF00] font-bold text-[10px] uppercase tracking-widest mb-2 line-clamp-1">{pr.name}</span>
                  <span className="text-4xl font-black text-white leading-none">{pr.weight}<span className="text-sm font-bold text-noir-text-muted ml-1">kg</span></span>
                  <span className="text-xs font-bold text-noir-text-muted mt-2 tracking-wider">× {pr.reps} REPS</span>
                  <span className="text-[9px] text-noir-text-muted mt-3 opacity-60 uppercase tracking-widest">{shortDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cumulative Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg flex flex-col justify-center items-center text-center hover:scale-[1.02] transition-transform">
          <CalendarCheck className="text-noir-accent mb-2" size={24} />
          <span className="text-3xl font-black">{stats.totalWorkouts}</span>
          <span className="text-[10px] uppercase tracking-widest text-noir-text-muted mt-1 font-bold">Workouts</span>
        </div>
        <div className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg flex flex-col justify-center items-center text-center hover:scale-[1.02] transition-transform">
          <Dumbbell className="text-noir-accent mb-2" size={24} />
          <span className="text-3xl font-black">{stats.totalSetsLogged}</span>
          <span className="text-[10px] uppercase tracking-widest text-noir-text-muted mt-1 font-bold">Sets Logged</span>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <div className="flex justify-between items-end border-b border-noir-border pb-2 px-2">
          <h3 className="text-xl font-bold">Tracked Lifts (Max Weight)</h3>
          <button 
            onClick={() => setIsAddTrackerOpen(true)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-noir-accent hover:text-[#2cff05] transition-colors"
          >
            <Plus size={16} /> Add 
          </button>
        </div>
        
        {chartData.map(series => {
          if (series.data.length === 0) {
            return (
              <div key={series.id} className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg hover:scale-[1.01] transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{series.name}</h3>
                    <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{series.muscle}</p>
                  </div>
                  <button 
                    onClick={() => removeTrackedLift(series.id)}
                    className="text-noir-text-muted hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="h-32 flex items-center justify-center border border-dashed border-noir-border rounded-lg bg-noir-bg">
                  <p className="text-sm text-noir-text-muted">Awaiting first log...</p>
                </div>
              </div>
            );
          }

          const currentMax = series.data[series.data.length - 1].weight;
          const initialMax = series.data[0].weight;
          const diff = currentMax - initialMax;
          const progressColor = diff > 0 ? "text-[#CCFF00]" : diff < 0 ? "text-red-500" : "text-noir-text-muted";

          return (
            <div key={series.id} className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg hover:scale-[1.01] transition-transform">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{series.name}</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{series.muscle}</p>
                    <button 
                      onClick={() => removeTrackedLift(series.id)}
                      className="text-noir-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{currentMax} kg</div>
                  {series.data.length > 1 && (
                    <div className={`text-xs font-bold ${progressColor}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg since start
                    </div>
                  )}
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#CCFF00', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value} kg`, 'Max Weight']}
                      labelStyle={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#CCFF00" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#121212', stroke: '#CCFF00' }} 
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#CCFF00' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Tracker Modal */}
      {isAddTrackerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-noir-bg/90 backdrop-blur-sm">
          <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">Track Custom Lift</h2>
            <p className="text-sm text-noir-text-muted mb-4">Select any exercise you have logged to pin it to your analytics dashboard.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-2">
              {availableExercisesToTrack.length === 0 ? (
                <p className="text-xs text-noir-text-muted italic">All your exercises are already being tracked.</p>
              ) : (
                availableExercisesToTrack.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      addTrackedLift({
                        id: ex.id,
                        name: ex.name,
                        muscle: "Custom",
                        color: "#CCFF00"
                      });
                      setIsAddTrackerOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-noir-border hover:bg-noir-bg hover:border-noir-accent transition-colors"
                  >
                    <p className="font-bold text-sm">{ex.name}</p>
                  </button>
                ))
              )}
            </div>

            <button 
              onClick={() => setIsAddTrackerOpen(false)} 
              className="w-full px-4 py-3 rounded-lg border border-noir-border hover:bg-noir-surface-light font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
