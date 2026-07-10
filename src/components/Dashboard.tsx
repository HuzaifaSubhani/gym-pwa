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
        
        <div className="relative z-10 flex justify-between items-center bg-noir-surface/60 backdrop-blur-md p-4 rounded-2xl border border-noir-border/50">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-noir-accent object-cover shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-noir-bg border-2 border-noir-border flex items-center justify-center shadow-lg">
                <Flame className="text-noir-accent" size={24} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-white">{username || "Athlete"}</h1>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-widest mt-0.5">Week {state.activeWeek}</h2>
            </div>
          </div>
          
          <div className="text-right flex flex-col items-end justify-center">
            <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold mb-1">Weekly Progress</p>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-noir-bg rounded-full h-2 overflow-hidden shadow-inner border border-noir-border/50">
                <div 
                  className="h-full bg-gradient-to-r from-noir-accent to-[#A78BFA] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(167,139,250,0.5)]" 
                  style={{ width: `${Math.max(2, progressPercentage)}%` }}
                ></div>
              </div>
              <p className="text-xs font-bold text-noir-accent w-8 text-right">{progressPercentage}%</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
