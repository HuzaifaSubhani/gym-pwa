"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { PROTOCOL_START_DATE, DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Play, CheckCircle2, Activity, Flame, Medal } from "lucide-react";
import PersonalRecords from "./PersonalRecords";

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

  // Calculate overall stats
  let totalWorkouts = 0;
  let totalVolume = 0;
  Object.keys(state.workoutLogs).forEach(date => {
    const dayLogs = state.workoutLogs[date];
    let hasValid = false;
    Object.values(dayLogs).forEach((logs: any) => {
      logs.forEach((log: any) => {
        const w = parseFloat(log.weight) || 0;
        const r = parseInt(log.reps) || 0;
        if (w > 0 || r > 0) hasValid = true;
        totalVolume += w * r;
      });
    });
    if (hasValid) totalWorkouts++;
  });
  const xp = Math.round(totalVolume / 10);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelXP = 100 * Math.pow(level - 1, 2);
  const nextLevelXP = 100 * Math.pow(level, 2);
  
  let progressPercentage = 0;
  if (nextLevelXP > currentLevelXP) {
    progressPercentage = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  }
  
  const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
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
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-0.5">LVL</span>
            <span className="text-4xl font-light text-white tracking-tighter leading-none">{level}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full mb-8 pt-6 border-t border-white/5">
          <div className="flex flex-col items-center text-center">
            <Activity className="text-zinc-500 mb-1" size={18} />
            <span className="text-xl font-bold text-white">{totalWorkouts}</span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mt-1">Workouts</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-r border-white/5 px-2">
            <Flame className="text-zinc-500 mb-1" size={18} />
            <span className="text-xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k</span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mt-1">Volume (kg)</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Medal className="text-zinc-500 mb-1" size={18} />
            <span className="text-xl font-bold text-white">{level}</span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mt-1">Level</span>
          </div>
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


      {/* Recent PRs Widget */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Recent PRs</h3>
        <PersonalRecords limit={4} horizontal={true} />
      </div>
    </div>
  );
}
