"use client";

import { useState, useEffect } from "react";
import { Weight, Activity, Flame, ChevronRight } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { PROTOCOL_WEEKS } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const { state, setWeightLog } = useProtocol();
  const [weightInput, setWeightInput] = useState(state.weightLogs[state.activeWeek] || "");
  const [username, setUsername] = useState("Athlete");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.user_metadata?.username) {
        setUsername(data.session.user.user_metadata.username);
      }
    });
  }, []);

  const handleWeightSubmit = () => {
    if (weightInput) {
      setWeightLog(state.activeWeek, weightInput);
    }
  };

  const progressPercentage = Math.round(((state.activeWeek - 1) / PROTOCOL_WEEKS) * 100);
  const isWeekend = state.activeDayOfWeek >= 5;

  return (
    <div className="space-y-6">
      {/* Premium Hero Section */}
      <section className="relative p-6 rounded-3xl overflow-hidden border border-noir-border shadow-2xl bg-noir-surface">
        {/* Dynamic Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-noir-accent/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-[#D038F3]/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xs text-noir-accent font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Activity size={14} /> IronCore Protocol
              </h2>
              <h1 className="text-3xl font-black text-white">Welcome back, <br/><span className="text-[#D038F3]">{username}</span></h1>
            </div>
            <div className="w-12 h-12 rounded-full bg-noir-bg border-2 border-noir-border flex items-center justify-center shadow-[0_0_15px_rgba(208,56,243,0.3)]">
              <Flame className="text-[#D038F3]" size={24} />
            </div>
          </div>
          
          <div className="bg-noir-bg/60 backdrop-blur-md rounded-2xl p-5 border border-noir-border/50">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold mb-1">Active Phase</p>
                <h3 className="text-xl font-black text-white">Week {state.activeWeek}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold mb-1">Completion</p>
                <p className="text-xl font-bold text-noir-accent">{progressPercentage}%</p>
              </div>
            </div>
            
            <div className="w-full bg-noir-surface rounded-full h-2 overflow-hidden shadow-inner relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-noir-accent to-[#D038F3] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(208,56,243,0.5)]" 
                style={{ width: `${Math.max(2, progressPercentage)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Weight Check-in */}
      {isWeekend && (
        <section className="relative p-6 bg-noir-surface/80 backdrop-blur-sm rounded-2xl border border-noir-border shadow-lg overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-noir-accent to-[#D038F3]"></div>
          
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-noir-bg rounded-lg border border-noir-border group-hover:border-noir-accent transition-colors">
              <Weight className="text-noir-accent" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">Week {state.activeWeek} Weigh-In</h2>
              <p className="text-[10px] text-noir-text-muted uppercase tracking-widest mt-0.5">Track your bodyweight trends</p>
            </div>
          </div>
          
          <div className="flex gap-3 relative z-10">
            <input
              type="number"
              placeholder="e.g. 85.5 kg"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 bg-noir-bg border border-noir-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:border-[#D038F3] transition-colors shadow-inner"
            />
            <button
              onClick={handleWeightSubmit}
              className="bg-gradient-to-r from-noir-accent to-[#D038F3] text-noir-bg px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(208,56,243,0.3)]"
            >
              Log <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
