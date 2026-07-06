"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { Dumbbell, CalendarCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ProgressAnalytics() {
  const { state } = useProtocol();
  const [activeTab, setActiveTab] = useState<"summary" | "charts">("charts");
  
  const primaryLifts = useMemo(() => [
    { id: "m1", name: "Incline DB Press", muscle: "Upper Chest", color: "#39ff14" },
    { id: "t1", name: "Pull-ups / Pulldown", muscle: "Lats", color: "#00ffff" },
    { id: "w1", name: "Hack Squat", muscle: "Quads", color: "#ff00ff" },
    { id: "th1", name: "Smith Machine Press", muscle: "Shoulders", color: "#ffff00" },
    { id: "f1", name: "Split Squats", muscle: "Legs", color: "#ff3333" },
  ], []);

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

  // Generate chart data series
  const chartData = useMemo(() => {
    const sortedDates = Object.keys(state.workoutLogs).sort();
    
    // Group by week (using the state.activeWeek is not historical, we need to map dateStr to week/day)
    // For simplicity, we will just use dateStr as the X-axis for each lift, 
    // or group by Week X Day Y. Since they perform the lift once a week, each log is a data point.
    
    const seriesData = primaryLifts.map(lift => {
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
  }, [state.workoutLogs, primaryLifts]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Analytics</h2>
        <h1 className="text-3xl font-black">Progress</h1>
      </header>

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

      <div className="space-y-6 mt-8">
        <h3 className="text-xl font-bold border-b border-noir-border pb-2 px-2">Primary Lifts (Max Weight)</h3>
        
        {chartData.map(series => {
          if (series.data.length === 0) {
            return (
              <div key={series.id} className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{series.name}</h3>
                    <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{series.muscle}</p>
                  </div>
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
          const progressColor = diff > 0 ? "text-noir-accent" : diff < 0 ? "text-red-500" : "text-noir-text-muted";

          return (
            <div key={series.id} className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{series.name}</h3>
                  <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{series.muscle}</p>
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
                      itemStyle={{ color: series.color, fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value} kg`, 'Max Weight']}
                      labelStyle={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke={series.color} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#121212' }} 
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
