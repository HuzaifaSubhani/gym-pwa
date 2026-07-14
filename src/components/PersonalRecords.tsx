"use client";

import { useState, useMemo } from "react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Share2, Medal, Trophy, Pin, Globe, X, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import exercisesData from "@/data/exercises.json";

export default function PersonalRecords({ limit, horizontal = false }: { limit?: number, horizontal?: boolean }) {
  const { state } = useProtocol();
  const [selectedPr, setSelectedPr] = useState<any>(null);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const handlePinToProfile = async () => {
    if (!selectedPr) return;
    setShareLoading("pin");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ pinned_pr: selectedPr }).eq("id", session.user.id);
      showToast("PR Pinned to Profile!");
    } else {
      showToast("Must be logged in to pin.");
    }
    setShareLoading(null);
    setSelectedPr(null);
  };

  const handlePostToFeed = async () => {
    if (!selectedPr) return;
    setShareLoading("feed");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("community_feed").insert({
        user_id: session.user.id,
        type: "pr_shared",
        content: selectedPr
      });
      showToast("PR Shared to Global Feed!");
    } else {
      showToast("Must be logged in to post.");
    }
    setShareLoading(null);
    setSelectedPr(null);
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
    <div className={containerClasses}>
      {personalRecords.map((pr, idx) => (
        <div 
          key={`${pr.name}-${idx}`} 
          className={`relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg group snap-center ${horizontal ? 'min-w-[240px] flex-shrink-0' : ''}`}
        >
          {/* Accent gradient behind the medal */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="bg-zinc-800 p-2 rounded-xl">
              <Medal size={20} className="text-yellow-500" />
            </div>
            <button 
              onClick={() => setSelectedPr(pr)}
              className="text-zinc-500 hover:text-white transition-colors p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-800"
              aria-label="Share PR"
            >
              <Share2 size={16} />
            </button>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-zinc-300 text-sm font-semibold truncate mb-1" title={pr.name}>{pr.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{pr.weight}</span>
              <span className="text-sm font-bold text-yellow-500">kg</span>
              <span className="text-zinc-500 text-sm ml-1">× {pr.reps}</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-3">
              {new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      ))}
      {/* Share Modal */}
      {selectedPr && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedPr(null)}>
          <div className="bg-noir-surface border border-noir-border rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 pb-safe animate-in slide-in-from-bottom-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPr(null)} className="absolute top-4 right-4 p-2 bg-noir-bg rounded-full border border-noir-border hover:text-white transition-colors">
              <X size={16} />
            </button>
            
            <h3 className="text-xl font-black text-white mb-1 mt-2">Flex your PR</h3>
            <p className="text-xs text-noir-text-muted mb-6">Let everyone know about your {selectedPr.name} lift.</p>
            
            <div className="space-y-3">
              <button 
                onClick={handlePinToProfile}
                disabled={shareLoading !== null}
                className="w-full flex items-center justify-between p-4 bg-noir-bg border border-noir-border rounded-xl hover:border-noir-accent transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-noir-accent/10 p-2 rounded-lg text-noir-accent">
                    <Pin size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white group-hover:text-noir-accent transition-colors">Pin to Profile</div>
                    <div className="text-[10px] text-noir-text-muted uppercase tracking-widest">Show on your Leaderboard Badge</div>
                  </div>
                </div>
                {shareLoading === "pin" ? <Loader2 size={16} className="animate-spin text-noir-accent" /> : <Trophy size={16} className="text-noir-border group-hover:text-noir-accent transition-colors" />}
              </button>

              <button 
                onClick={handlePostToFeed}
                disabled={shareLoading !== null}
                className="w-full flex items-center justify-between p-4 bg-noir-bg border border-noir-border rounded-xl hover:border-noir-accent transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-noir-accent/10 p-2 rounded-lg text-noir-accent">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white group-hover:text-noir-accent transition-colors">Post to Global Feed</div>
                    <div className="text-[10px] text-noir-text-muted uppercase tracking-widest">Share with all athletes</div>
                  </div>
                </div>
                {shareLoading === "feed" ? <Loader2 size={16} className="animate-spin text-noir-accent" /> : <Share2 size={16} className="text-noir-border group-hover:text-noir-accent transition-colors" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in">
          <div className="bg-noir-accent text-black px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm uppercase tracking-widest">
            <Check size={16} /> {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
