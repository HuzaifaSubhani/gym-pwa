"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { PROTOCOL_START_DATE, DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Play, CheckCircle2, ChevronRight, Activity } from "lucide-react";

function getProtocolDateString(week: number, dayNum: number) {
  const date = new Date(PROTOCOL_START_DATE);
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Dashboard({ 
  avatarUrl, 
  username, 
  onStartWorkout 
}: { 
  avatarUrl?: string | null, 
  username?: string,
  onStartWorkout?: () => void
}) {
  const { state } = useProtocol();
  
  let completedDays = 0;
  for (let i = 1; i <= 7; i++) {
    const dStr = getProtocolDateString(state.activeWeek, i);
    if (state.workoutLogs[dStr] && Object.keys(state.workoutLogs[dStr]).length > 0) {
      completedDays++;
    }
  }
  
  const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
  const targetDays = Object.values(activeProgram.routine_schema).filter(day => day.exercises.length > 0).length || 1;
  const progressPercentage = Math.min(100, Math.round((completedDays / targetDays) * 100));

  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Profile Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {username ? `Ready, ${username}?` : "Ready to train?"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Let's crush today's goals.</p>
        </div>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover shadow-sm border border-zinc-800" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
            <span className="text-zinc-500 font-medium">{username?.charAt(0)?.toUpperCase() || "U"}</span>
          </div>
        )}
      </div>

      {/* Main Focus Card */}
      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="w-full flex justify-between items-start mb-6">
          <div>
            <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-1">Active Plan</h2>
            <p className="text-white font-medium text-lg truncate max-w-[180px]">{activeProgram.name}</p>
          </div>
          <div className="text-right">
            <h2 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-1">Week</h2>
            <p className="text-white font-medium text-lg">{state.activeWeek}</p>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative flex items-center justify-center mb-6">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="rgba(255,255,255,0.05)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke="white"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-light text-white tracking-tighter">{progressPercentage}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
          <Activity size={16} />
          <span>{completedDays} of {targetDays} workouts done</span>
        </div>

        {/* Big Start Button */}
        <button 
          onClick={onStartWorkout}
          className="w-full bg-white text-black hover:bg-zinc-200 transition-colors py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.98]"
        >
          <Play size={20} className="fill-black" />
          Start Training
        </button>
      </div>
      
      {/* Mini Schedule View */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Weekly Split</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const dayData = activeProgram.routine_schema[day];
            if (!dayData || dayData.exercises.length === 0) return null;
            
            const isCompleted = state.workoutLogs[getProtocolDateString(state.activeWeek, day)] && Object.keys(state.workoutLogs[getProtocolDateString(state.activeWeek, day)]).length > 0;
            
            return (
              <div key={day} className={`flex-shrink-0 w-24 p-3 rounded-xl border ${isCompleted ? 'bg-white/5 border-white/10' : 'bg-transparent border-zinc-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">Day {day}</span>
                  {isCompleted && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <p className={`text-xs font-medium truncate ${isCompleted ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {dayData.focus}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
