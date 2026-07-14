"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Dumbbell, Activity, CalendarDays } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import exercisesData from "@/data/exercises.json";

export default function WorkoutHistory() {
  const { state } = useProtocol();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

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

  const renderCalendar = () => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 border border-transparent"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const summary = getLogSummary(dateStr);
      const isToday = today.getTime() === new Date(year, month, day).getTime();

      days.push(
        <button
          key={dateStr}
          onClick={() => summary && setSelectedDateStr(dateStr)}
          className={`relative h-12 flex flex-col items-center justify-center rounded-lg border transition-all ${
            summary 
              ? "bg-noir-accent/20 border-noir-accent text-noir-accent hover:bg-noir-accent/30 cursor-pointer shadow-[0_0_10px_rgba(204,255,0,0.2)]" 
              : "bg-noir-surface border-noir-border/50 text-noir-text-muted hover:bg-noir-surface-light cursor-default"
          } ${isToday && !summary ? "border-white/30 text-white" : ""}`}
        >
          <span className={`text-sm font-bold ${isToday ? "underline decoration-2 underline-offset-2" : ""}`}>{day}</span>
          {summary && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-noir-accent shadow-[0_0_5px_rgba(204,255,0,1)]"></div>}
        </button>
      );
    }

    return days;
  };

  const selectedSummary = selectedDateStr ? getLogSummary(selectedDateStr) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Your Journey</h2>
        <h1 className="text-3xl font-black flex items-center gap-3">
          History <CalendarDays className="text-noir-accent" size={28} />
        </h1>
      </header>

      <div className="bg-noir-surface border border-noir-border rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-noir-accent/10 blur-[50px] rounded-full pointer-events-none"></div>

        <div className="flex items-center justify-between mb-6 relative z-10">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-noir-surface-light rounded-lg transition-colors border border-noir-border">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black">{monthNames[month]} {year}</h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-noir-surface-light rounded-lg transition-colors border border-noir-border">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 relative z-10">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-xs font-bold text-noir-text-muted uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 relative z-10">
          {renderCalendar()}
        </div>
      </div>

      {/* Daily Summary Modal */}
      {selectedDateStr && selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDateStr(null)}></div>
          <div className="bg-noir-surface border border-noir-border w-full max-w-md rounded-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <button 
              onClick={() => setSelectedDateStr(null)}
              className="absolute top-4 right-4 p-2 bg-noir-bg rounded-full border border-noir-border hover:bg-red-500/20 hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black mb-1 flex items-center gap-2">
              <CalendarIcon size={24} className="text-noir-accent" />
              {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </h3>
            <p className="text-sm text-noir-text-muted mb-6 uppercase tracking-widest font-bold">Workout Summary</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-noir-bg p-4 rounded-xl border border-noir-border flex flex-col items-center justify-center">
                <Dumbbell className="text-amber-400 mb-2" size={24} />
                <span className="text-2xl font-black">{selectedSummary.totalVolume.toLocaleString()}</span>
                <span className="text-[10px] text-noir-text-muted uppercase tracking-widest">Total Volume (kg)</span>
              </div>
              <div className="bg-noir-bg p-4 rounded-xl border border-noir-border flex flex-col items-center justify-center">
                <Activity className="text-green-400 mb-2" size={24} />
                <span className="text-2xl font-black">{selectedSummary.totalSets}</span>
                <span className="text-[10px] text-noir-text-muted uppercase tracking-widest">Sets Completed</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(selectedSummary.logs).map(([exId, sets]) => {
                const exerciseData = exercisesData.find(e => e.id === exId);
                const name = exerciseData?.name || `Custom Exercise (${exId})`;
                const validSets = sets.filter(s => s.weight && s.reps);
                
                if (validSets.length === 0) return null;

                return (
                  <div key={exId} className="bg-noir-bg border border-noir-border/50 rounded-lg p-3">
                    <h4 className="font-bold text-sm mb-2 text-noir-accent">{name}</h4>
                    <div className="space-y-1">
                      {validSets.map((s, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-noir-text-muted">
                          <span>Set {idx + 1}</span>
                          <span className="font-bold text-white">{s.weight}kg x {s.reps}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
