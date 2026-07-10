"use client";

import { useState, useEffect } from "react";
import { Weight, Activity, Flame, ChevronRight } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { PROTOCOL_WEEKS, PROTOCOL_START_DATE } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";

function getProtocolDateString(week: number, dayNum: number) {
  const date = new Date(PROTOCOL_START_DATE);
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Dashboard({ avatarUrl }: { avatarUrl?: string | null }) {
  const { state, setWeightLog } = useProtocol();
  const [weightInput, setWeightInput] = useState(state.weightLogs[state.activeWeek] || "");

  const handleWeightSubmit = () => {
    if (weightInput) {
      setWeightLog(state.activeWeek, weightInput);
    }
  };

  let completedDays = 0;
  for (let i = 1; i <= 7; i++) {
    const dStr = getProtocolDateString(state.activeWeek, i);
    if (state.workoutLogs[dStr] && Object.keys(state.workoutLogs[dStr]).length > 0) {
      completedDays++;
    }
  }
  // Assume 4 workouts per week is 100%
  const progressPercentage = Math.min(100, Math.round((completedDays / 4) * 100));
  
  const isWeekend = state.activeDayOfWeek >= 5;

  return (
    <div className="space-y-6">
      {/* Premium Hub Controls */}
      <section className="relative p-6 rounded-3xl overflow-hidden border border-noir-border shadow-2xl bg-noir-surface">
        {/* Dynamic Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-noir-accent/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-[#A78BFA]/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Activity size={14} /> Active Training Phase
              </h2>
              <h1 className="text-3xl font-black text-white">Week {state.activeWeek}</h1>
            </div>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-noir-accent object-cover shadow-[0_0_15px_rgba(167,139,250,0.3)] animate-float" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-noir-bg border-2 border-noir-border flex items-center justify-center shadow-[0_0_15px_rgba(167,139,250,0.3)] animate-float">
                <Flame className="text-[#A78BFA]" size={24} />
              </div>
            )}
          </div>
          
          <div className="bg-noir-bg/60 backdrop-blur-md rounded-xl p-4 border border-noir-border/50">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold">Weekly Progress</p>
              <p className="text-sm font-bold text-noir-accent">{progressPercentage}%</p>
            </div>
            
            <div className="w-full bg-noir-surface rounded-full h-1.5 overflow-hidden shadow-inner relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-noir-accent to-[#A78BFA] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(167,139,250,0.5)]" 
                style={{ width: `${Math.max(2, progressPercentage)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
