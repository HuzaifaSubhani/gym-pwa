"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { TrendingUp, TrendingDown, Minus, Activity, Cloud, Link as LinkIcon, Check } from "lucide-react";
import { useMemo, useState } from "react";

export default function ProgressAnalytics() {
  const { state, setSyncId } = useProtocol();
  const [linkInput, setLinkInput] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const analyticsData = useMemo(() => {
    const primaryLifts = [
      { id: "m1", name: "Incline DB Press", muscle: "Upper Chest" },
      { id: "t1", name: "Pull-ups / Pulldown", muscle: "Lats" },
      { id: "w1", name: "Hack Squat", muscle: "Quads" },
      { id: "th1", name: "Smith Machine Press", muscle: "Shoulders" },
      { id: "f1", name: "Split Squats", muscle: "Legs" },
    ];

    const sortedDates = Object.keys(state.workoutLogs).sort();
    
    return primaryLifts.map(lift => {
      const datesPerfomed = sortedDates.filter(d => state.workoutLogs[d]?.[lift.id]?.some(s => s.weight));
      
      if (datesPerfomed.length === 0) return { ...lift, status: "no_data", lastMaxWeight: 0, prevMaxWeight: 0 };
      if (datesPerfomed.length === 1) {
        const lastDate = datesPerfomed[0];
        const lastSets = state.workoutLogs[lastDate][lift.id];
        const lastMaxWeight = Math.max(...lastSets.map(s => parseFloat(s.weight) || 0));
        return { ...lift, status: "baseline", lastMaxWeight, prevMaxWeight: 0 };
      }
      
      const lastDate = datesPerfomed[datesPerfomed.length - 1];
      const prevDate = datesPerfomed[datesPerfomed.length - 2];
      
      const lastSets = state.workoutLogs[lastDate][lift.id];
      const prevSets = state.workoutLogs[prevDate][lift.id];
      
      const lastMaxWeight = Math.max(...lastSets.map(s => parseFloat(s.weight) || 0));
      const prevMaxWeight = Math.max(...prevSets.map(s => parseFloat(s.weight) || 0));
      
      let status = "maintained";
      if (lastMaxWeight > prevMaxWeight) status = "progressed";
      if (lastMaxWeight < prevMaxWeight) status = "regressed";
      
      return {
        ...lift,
        lastMaxWeight,
        prevMaxWeight,
        status
      };
    });
  }, [state.workoutLogs]);

  const handleCopyId = () => {
    if (state.syncId) {
      navigator.clipboard.writeText(state.syncId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkDevice = async () => {
    if (!linkInput) return;
    setIsLinking(true);
    setSyncStatus("");
    try {
      await setSyncId(linkInput.trim());
      setSyncStatus("Successfully linked! Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setSyncStatus("Invalid Sync ID or network error.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analyticsData.map(data => (
          <div key={data.id} className="bg-noir-surface rounded-xl border border-noir-border p-5 shadow-lg relative overflow-hidden group hover:border-noir-accent transition-colors">
            
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-noir-accent/5 rounded-full blur-2xl group-hover:bg-noir-accent/10 transition-colors"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg leading-tight">{data.name}</h3>
                <p className="text-xs text-noir-text-muted mt-1 uppercase tracking-widest">{data.muscle}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-noir-bg flex items-center justify-center border border-noir-border">
                {data.status === "progressed" && <TrendingUp className="text-noir-accent" size={20} />}
                {data.status === "regressed" && <TrendingDown className="text-red-500" size={20} />}
                {data.status === "maintained" && <Minus className="text-noir-text-muted" size={20} />}
                {data.status === "baseline" && <Activity className="text-noir-accent" size={20} />}
                {data.status === "no_data" && <Minus className="text-noir-border" size={20} />}
              </div>
            </div>

            <div className="flex items-end gap-3 mt-6">
              {data.status === "no_data" ? (
                <p className="text-sm text-noir-text-muted">Awaiting first log...</p>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-noir-text-muted uppercase tracking-wider mb-1">Current Max</span>
                    <span className="text-3xl font-black">{data.lastMaxWeight}<span className="text-sm text-noir-text-muted ml-1">kg</span></span>
                  </div>
                  
                  {data.prevMaxWeight > 0 && (
                    <div className="flex flex-col ml-4 opacity-50">
                      <span className="text-[10px] text-noir-text-muted uppercase tracking-wider mb-1">Previous</span>
                      <span className="text-xl font-bold">{data.prevMaxWeight}<span className="text-xs ml-1">kg</span></span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cloud Sync Utility */}
      <div className="bg-noir-surface rounded-xl border border-noir-border p-5 shadow-lg mt-8">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="text-noir-accent" size={20} />
          <h3 className="font-bold text-lg">Cloud Sync</h3>
        </div>
        <p className="text-sm text-noir-text-muted mb-6">Your data is automatically backing up to the cloud. To access your data on another device, paste this Sync ID into the other device.</p>
        
        <div className="space-y-6">
          <div>
            <span className="text-xs uppercase text-noir-text-muted font-bold tracking-widest mb-2 block">Your Sync ID</span>
            <button 
              onClick={handleCopyId}
              className="w-full bg-noir-bg border border-noir-border hover:border-noir-accent text-noir-accent font-mono font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors min-h-[44px]"
            >
              <span className="tracking-widest">{state.syncId || "GENERATING..."}</span>
              {copied ? <Check size={18} /> : <Copy size={18} className="opacity-50" />}
            </button>
          </div>
          
          <div className="pt-4 border-t border-noir-border border-dashed">
            <span className="text-xs uppercase text-noir-text-muted font-bold tracking-widest mb-2 block">Link Existing Device</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste Sync ID here..." 
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 bg-noir-bg border border-noir-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-noir-accent min-h-[44px]"
              />
              <button 
                onClick={handleLinkDevice}
                disabled={!linkInput || isLinking}
                className="bg-noir-accent text-noir-bg font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                <LinkIcon size={18} /> {isLinking ? "..." : "Link"}
              </button>
            </div>
            {syncStatus && (
              <p className={`text-xs font-bold mt-3 text-center ${syncStatus.includes("Error") || syncStatus.includes("Invalid") ? "text-red-500" : "text-noir-accent"}`}>
                {syncStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
