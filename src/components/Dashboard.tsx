"use client";

import { useState } from "react";
import { Weight } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { PROTOCOL_WEEKS } from "@/data/protocol";

export default function Dashboard() {
  const { state, setWeightLog } = useProtocol();
  const [weightInput, setWeightInput] = useState(state.weightLogs[state.activeWeek] || "");

  const handleWeightSubmit = () => {
    if (weightInput) {
      setWeightLog(state.activeWeek, weightInput);
    }
  };

  const progressPercentage = Math.round(((state.activeWeek - 1) / PROTOCOL_WEEKS) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Progress */}
      <section className="p-6 bg-noir-surface rounded-xl border border-noir-border shadow-lg">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Active Phase</h2>
            <h1 className="text-3xl font-black">Week {state.activeWeek}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-noir-text-muted mb-1">Goal</p>
            <p className="text-xl font-bold">90kg <span className="text-noir-accent">→</span> 80kg</p>
          </div>
        </div>
        <div className="w-full bg-noir-bg rounded-full h-2 mb-2">
          <div className="bg-noir-accent h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <p className="text-xs text-noir-text-muted text-right">{progressPercentage}% Complete</p>
      </section>

      {/* Weekly Weight Check-in */}
      {state.activeDayOfWeek >= 5 && (
        <section className="p-6 bg-noir-surface rounded-xl border border-noir-border shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-noir-accent"></div>
          <div className="flex items-center gap-3 mb-4">
            <Weight className="text-noir-accent" size={24} />
            <h2 className="text-lg font-bold">End of Week {state.activeWeek} Weigh-In</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Enter current weight (kg)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 bg-noir-bg border border-noir-border rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-noir-accent transition-colors min-h-[44px]"
            />
            <button
              onClick={handleWeightSubmit}
              className="bg-noir-accent text-noir-bg px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity min-h-[44px]"
            >
              Log
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
