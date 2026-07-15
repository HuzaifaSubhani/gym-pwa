"use client";

import { useState, useMemo, useEffect } from "react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Medal, Trophy, Pin, Globe, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import exercisesData from "@/data/exercises.json";

export default function PersonalRecords({ limit, horizontal = false }: { limit?: number, horizontal?: boolean }) {
  const { state } = useProtocol();
  const [pinnedPrName, setPinnedPrName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load which PR is currently pinned from the user's profile
  useEffect(() => {
    const loadPinned = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("pinned_pr").eq("id", session.user.id).single();
        if (data?.pinned_pr?.name) {
          setPinnedPrName(data.pinned_pr.name);
        }
      }
    };
    loadPinned();
  }, []);

  const personalRecords = useMemo(() => {
    const prs: Record<string, { weight: number, reps: number, date: string, name: string }> = {};
    
    // Fast name lookup
    const exMap = new Map<string, string>();
    exercisesData.forEach(ex => exMap.set(ex.id, ex.name));

    // Also map from active programs and defaults since they might use custom string IDs (like "m1")
    const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
    if (activeProgram?.routine_schema) {
      Object.values(activeProgram.routine_schema).forEach(day => day.exercises?.forEach(ex => exMap.set(ex.id, ex.name)));
    }
    if (state.customRoutine) {
      Object.values(state.customRoutine).forEach((day: any) => day.exercises?.forEach((ex: any) => exMap.set(ex.id, ex.name)));
    }
    if (state.customDailyExercises) {
      Object.values(state.customDailyExercises).forEach((dayExs: any[]) => dayExs.forEach(ex => exMap.set(ex.id, ex.name)));
    }

    Object.entries(state.workoutLogs).forEach(([dateStr, dayLogs]) => {
      Object.entries(dayLogs).forEach(([exId, logs]) => {
        // Only track PRs for exercises explicitly added to trackedLifts
        const isTracked = state.trackedLifts?.some(lift => lift.id === exId);
        if (!isTracked) return;

        logs.forEach(log => {
          const w = parseFloat(log.weight);
          const r = parseInt(log.reps, 10);
          if (!isNaN(w) && !isNaN(r)) {
            // A PR is higher weight, or same weight with more reps
            if (!prs[exId] || w > prs[exId].weight || (w === prs[exId].weight && r > prs[exId].reps)) {
              prs[exId] = { 
                weight: w, 
                reps: r, 
                date: dateStr, 
                name: exMap.get(exId) || "Unknown Lift" 
              };
            }
          }
        });
      });
    });
    
    // Sort by most recent date first
    let sortedPrs = Object.values(prs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (limit) {
      sortedPrs = sortedPrs.slice(0, limit);
    }
    return sortedPrs;
  }, [state.workoutLogs, limit]);

  const handlePinToggle = async (pr: any) => {
    const isAlreadyPinned = pinnedPrName === pr.name;
    setActionLoading(`pin-${pr.name}`);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (isAlreadyPinned) {
        // Unpin
        await supabase.from("profiles").update({ pinned_pr: null }).eq("id", session.user.id);
        setPinnedPrName(null);
        showToast("PR Unpinned");
      } else {
        // Pin this one
        await supabase.from("profiles").update({ pinned_pr: pr }).eq("id", session.user.id);
        setPinnedPrName(pr.name);
        showToast("PR Pinned as Badge!");
      }
    }
    setActionLoading(null);
  };

  const handlePostToFeed = async (pr: any) => {
    setActionLoading(`feed-${pr.name}`);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("community_feed").insert({
        user_id: session.user.id,
        type: "pr_shared",
        content: pr
      });
      if (error) {
        showToast("Failed — check Supabase table");
        console.error(error);
      } else {
        showToast("PR Posted to Feed!");
      }
    }
    setActionLoading(null);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (personalRecords.length === 0) {
    return (
      <div className="text-center py-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
        <Trophy size={32} className="mx-auto text-zinc-600 mb-2" />
        <p className="text-zinc-400 text-sm">No PRs recorded yet. Keep lifting!</p>
      </div>
    );
  }

  const containerClasses = horizontal 
    ? "flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] snap-x" 
    : "grid grid-cols-1 sm:grid-cols-2 gap-4";

  return (
    <>
    <div className={containerClasses}>
      {personalRecords.map((pr, idx) => {
        const isPinned = pinnedPrName === pr.name;
        return (
          <div 
            key={`${pr.name}-${idx}`} 
            className={`relative overflow-hidden bg-zinc-900 border rounded-2xl p-5 shadow-lg snap-center transition-all duration-300 ${horizontal ? 'min-w-[240px] flex-shrink-0' : ''} ${
              isPinned 
                ? 'border-noir-accent/60 shadow-[0_0_20px_rgba(204,255,0,0.1)]' 
                : 'border-zinc-800'
            }`}
          >
            {/* Accent gradient behind the medal */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Pinned Badge */}
            {isPinned && (
              <div className="absolute top-3 right-3 bg-noir-accent/20 text-noir-accent text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-noir-accent/40">
                Pinned
              </div>
            )}
            
            <div className="flex items-start mb-3 relative z-10">
              <div className="bg-zinc-800 p-2 rounded-xl">
                <Medal size={20} className="text-yellow-500" />
              </div>
            </div>
            
            <div className="relative z-10 mb-4">
              <h3 className="text-zinc-300 text-sm font-semibold truncate mb-1" title={pr.name}>{pr.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{pr.weight}</span>
                <span className="text-sm font-bold text-yellow-500">kg</span>
                <span className="text-zinc-500 text-sm ml-1">× {pr.reps}</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                {new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Inline Action Buttons */}
            <div className="flex gap-2 relative z-10 border-t border-zinc-800 pt-3">
              <button 
                onClick={() => handlePinToggle(pr)}
                disabled={actionLoading !== null}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  isPinned 
                    ? 'bg-noir-accent/20 border-noir-accent/50 text-noir-accent' 
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-noir-accent hover:border-noir-accent/30'
                }`}
              >
                {actionLoading === `pin-${pr.name}` ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Pin size={12} className={isPinned ? "fill-current" : ""} />
                )}
                {isPinned ? "Pinned" : "Pin"}
              </button>
              
              <button 
                onClick={() => handlePostToFeed(pr)}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-blue-400 hover:border-blue-400/30"
              >
                {actionLoading === `feed-${pr.name}` ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Globe size={12} />
                )}
                Post
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {/* Toast Notification */}
    {toastMsg && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in">
        <div className="bg-noir-accent text-black px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm uppercase tracking-widest">
          <Check size={16} /> {toastMsg}
        </div>
      </div>
    )}
    </>
  );
}
