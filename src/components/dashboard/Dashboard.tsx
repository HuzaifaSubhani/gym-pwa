"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import Image from "next/image";
import { Play, Activity, Flame } from "lucide-react";
import PersonalRecords from "@/components/social/PersonalRecords";
import { getProtocolDateString, calculateVolume } from "@/lib/dateUtils";

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

  // Calculate overall stats — now includes drop set volume via shared utility
  let totalWorkouts = 0;
  let totalVolume = 0;
  Object.keys(state.workoutLogs).forEach(date => {
    const dayLogs = state.workoutLogs[date];
    let hasValid = false;
    Object.values(dayLogs).forEach((logs) => {
      const vol = calculateVolume(logs);
      if (vol > 0) hasValid = true;
      totalVolume += vol;
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
  
  
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Main Focus Card */}
      <div className="bg-noir-bg border border-noir-border rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-noir-accent/30 to-transparent"></div>
        
        <div className="w-full flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {username ? `Ready, ${username}?` : "Ready to train?"}
            </h1>
            <p className="text-sm text-noir-text-muted mt-1">Let's crush today's goals.</p>
          </div>
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={48} height={48} className="w-12 h-12 rounded-full object-cover shadow-sm border border-noir-border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center shadow-sm">
              <span className="text-noir-text-muted font-medium">{username?.charAt(0)?.toUpperCase() || "U"}</span>
            </div>
          )}
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
              stroke="currentColor"
              className="text-noir-accent"
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
            <span className="text-[10px] uppercase font-bold tracking-widest text-noir-text-muted mb-0.5">LVL</span>
            <span className="text-4xl font-black text-white tracking-tighter leading-none">{level}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-8 pt-6 border-t border-white/5">
          <div className="flex flex-col items-center text-center">
            <Activity className="text-noir-text-muted mb-1" size={18} />
            <span className="text-xl font-bold text-white">{totalWorkouts}</span>
            <span className="text-[9px] uppercase font-bold text-noir-text-muted tracking-widest mt-1">Workouts</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-white/5 px-2">
            <Flame className="text-noir-text-muted mb-1" size={18} />
            <span className="text-xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k</span>
            <span className="text-[9px] uppercase font-bold text-noir-text-muted tracking-widest mt-1">Volume (kg)</span>
          </div>
        </div>

        {/* Big Start Button */}
        <button 
          onClick={onStartWorkout}
          className="w-full bg-noir-accent text-black hover:bg-[#d4ff00] transition-colors py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,255,0,0.15)] active:scale-[0.98]"
        >
          <Play size={20} className="fill-black" />
          Start Training
        </button>
      </div>


      {/* Recent PRs Widget */}
      <div className="bg-noir-bg border border-noir-border rounded-2xl p-4">
        <h3 className="text-xs font-bold text-noir-text-muted uppercase tracking-widest mb-3">Recent PRs</h3>
        <PersonalRecords limit={4} horizontal={true} />
      </div>
    </div>
  );
}
