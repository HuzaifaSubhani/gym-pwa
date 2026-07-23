"use client";

import { useState, useMemo, useEffect } from "react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { DEFAULT_IRONCORE_PROGRAM } from "@/data/protocol";
import { Medal, Trophy, Pin, Globe, Loader2, Check, Plus, Trash2, X, Search, Filter } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import exercisesData from "@/data/exercises.json";

const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio"];

export default function PersonalRecords({ limit, horizontal = false }: { limit?: number, horizontal?: boolean }) {
  const state = useProtocol(s => s.state);
  const addTrackedLift = useProtocol(s => s.addTrackedLift);
  const removeTrackedLift = useProtocol(s => s.removeTrackedLift);
  const [pinnedPrName, setPinnedPrName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

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

  const availableExercisesToTrack = useMemo(() => {
    const nameLookup = new Map<string, string>();
    
    // Default exercises
    exercisesData.forEach(ex => nameLookup.set(ex.id, ex.name));
    
    // Map all known exercises from active program
    const activeProgram = state.programs?.[state.activeProgramId] || DEFAULT_IRONCORE_PROGRAM;
    if (activeProgram?.routine_schema) {
      Object.values(activeProgram.routine_schema).forEach(day => {
        day.exercises?.forEach(ex => nameLookup.set(ex.id, ex.name));
      });
    }
    
    if (state.customRoutine) {
      Object.values(state.customRoutine).forEach((day: any) => {
        day.exercises?.forEach((ex: any) => nameLookup.set(ex.id, ex.name));
      });
    }
    
    if (state.customDailyExercises) {
      Object.values(state.customDailyExercises).forEach((dayExs: any[]) => {
        dayExs.forEach(ex => nameLookup.set(ex.id, ex.name));
      });
    }
  
    // Only include exercises that the user has actually logged
    const loggedExercises = new Map<string, any>();
    Object.values(state.workoutLogs).forEach(dayLogs => {
      Object.keys(dayLogs).forEach(exId => {
        if (!loggedExercises.has(exId)) {
          const exName = nameLookup.get(exId) || "Unknown Lift";
          let exFullData = exercisesData.find(e => e.id === exId);
          if (!exFullData && exName !== "Unknown Lift") {
            exFullData = exercisesData.find(e => e.name.toLowerCase() === exName.toLowerCase());
          }
          loggedExercises.set(exId, { 
            id: exId, 
            name: exName,
            t: exFullData?.t || "Unknown",
            b: exFullData?.b || "Unknown"
          });
        }
      });
    });

    // Filter out already tracked
    const trackedLifts = state.trackedLifts || [];
    return Array.from(loggedExercises.values()).filter(ex => !trackedLifts.find(l => l.id === ex.id));
  }, [state.workoutLogs, state.customRoutine, state.customDailyExercises, state.trackedLifts]);

  const personalRecords = useMemo(() => {
    const prs: Record<string, { weight: number, reps: number, date: string, name: string, id: string }> = {};
    
    const exMap = new Map<string, string>();
    exercisesData.forEach(ex => exMap.set(ex.id, ex.name));

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
        const isTracked = state.trackedLifts?.some(lift => lift.id === exId);
        if (!isTracked) return;

        logs.forEach(log => {
          const checkPr = (weightStr: string, repsStr: string) => {
            const w = parseFloat(weightStr);
            const r = parseInt(repsStr, 10);
            if (!isNaN(w) && !isNaN(r)) {
              if (!prs[exId] || w > prs[exId].weight || (w === prs[exId].weight && r > prs[exId].reps)) {
                prs[exId] = { 
                  id: exId,
                  weight: w, 
                  reps: r, 
                  date: dateStr, 
                  name: exMap.get(exId) || "Unknown Lift" 
                };
              }
            }
          };
          checkPr(log.weight, log.reps);
          if (log.drops) {
            log.drops.forEach(drop => checkPr(drop.weight, drop.reps));
          }
        });
      });
    });
    
    let sortedPrs = Object.values(prs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (limit) sortedPrs = sortedPrs.slice(0, limit);
    return sortedPrs;
  }, [state.workoutLogs, state.trackedLifts, limit]);

  const handlePinToggle = async (pr: any) => {
    const isAlreadyPinned = pinnedPrName === pr.name;
    setActionLoading(`pin-${pr.name}`);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (isAlreadyPinned) {
        await supabase.from("profiles").update({ pinned_pr: null }).eq("id", session.user.id);
        setPinnedPrName(null);
        showToast("PR Unpinned");
      } else {
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

  const containerClasses = horizontal 
    ? "flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] snap-x mt-4" 
    : "grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4";

  const searchTerms = searchQuery.toLowerCase().split(" ").filter(t => t.trim().length > 0);

  const filteredExercisesToTrack = availableExercisesToTrack.filter((ex: any) => {
    // 1. Muscle Filter Match
    if (muscleFilter) {
      if (ex.t !== muscleFilter && ex.b !== muscleFilter) return false;
    }
    
    // 2. Text Search Match (fuzzy - all terms must match something in the exercise)
    if (searchTerms.length > 0) {
      const exString = `${ex.name} ${ex.t} ${ex.b}`.toLowerCase();
      const matchesAllTerms = searchTerms.every(term => exString.includes(term));
      if (!matchesAllTerms) return false;
    }
    
    return true;
  });

  return (
    <>
    <div className="flex justify-between items-center px-1 mb-2">
      <p className="text-xs text-noir-text-muted">Your best lifts from tracked exercises.</p>
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-noir-accent bg-noir-accent/10 px-3 py-1.5 rounded-full hover:bg-noir-accent/20 transition-colors"
      >
        <Plus size={12} /> Add PR
      </button>
    </div>

    {personalRecords.length === 0 ? (
      <div className="text-center py-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 mt-4">
        <Trophy size={32} className="mx-auto text-zinc-600 mb-2" />
        <p className="text-zinc-400 text-sm">No PRs recorded yet.</p>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="mt-4 text-noir-accent text-xs font-bold uppercase tracking-widest underline decoration-noir-accent/30 underline-offset-4"
        >
          Track an exercise to start
        </button>
      </div>
    ) : (
      <div className={containerClasses}>
        {personalRecords.map((pr, idx) => {
          const isPinned = pinnedPrName === pr.name;
          return (
            <div 
              key={`${pr.name}-${idx}`} 
              className={`relative overflow-hidden bg-zinc-900 border rounded-2xl p-5 shadow-lg snap-center transition-all duration-300 ${horizontal ? 'min-w-[240px] flex-shrink-0' : ''} ${
                isPinned 
                  ? 'border-noir-accent/60 shadow-[0_0_20px_rgba(204,255,0,0.1)]' 
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Accent gradient behind the medal */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="bg-zinc-800 p-2 rounded-xl relative">
                  <Medal size={20} className="text-yellow-500" />
                  {isPinned && (
                    <div className="absolute -top-2 -right-2 bg-noir-accent text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-black shadow-lg">
                      Pinned
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => {
                    removeTrackedLift(pr.id);
                    if (isPinned) {
                      handlePinToggle(pr); // Unpin it if it was pinned
                    }
                    showToast("PR Removed");
                  }}
                  className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg -mr-1 -mt-1"
                  title="Remove PR tracking"
                >
                  <Trash2 size={14} />
                </button>
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
    )}

    {/* Add Tracker Modal */}
    {isAddModalOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-noir-surface border border-noir-border rounded-2xl p-5 md:p-6 shadow-2xl w-full max-w-[340px] md:max-w-sm animate-in zoom-in-95 relative max-h-[85vh] flex flex-col">
          <button 
            onClick={() => { setIsAddModalOpen(false); setSearchQuery(""); }}
            className="absolute top-4 right-4 text-noir-text-muted hover:text-white transition-colors bg-noir-bg p-1.5 rounded-full border border-noir-border"
          >
            <X size={16} />
          </button>
          
          <h2 className="text-xl font-black mb-2 text-white">Add PR</h2>
          <p className="text-xs text-noir-text-muted mb-4 leading-relaxed">Select any exercise. Your best lift will automatically be calculated and displayed.</p>
          
          {/* Muscle Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar flex-shrink-0">
            <button 
              onClick={() => setMuscleFilter(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${muscleFilter === null ? 'bg-white text-black' : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white'}`}
            >
              All
            </button>
            {MUSCLE_GROUPS.map(m => (
              <button 
                key={m}
                onClick={() => setMuscleFilter(m)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${muscleFilter === m ? 'bg-noir-accent text-black' : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mb-4 flex-shrink-0 relative">
            <Search className="absolute left-4 top-3.5 text-zinc-500" size={16} />
            <input 
              type="text"
              placeholder="Search logged exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-noir-accent transition-colors"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-2 custom-scrollbar min-h-0">
            {availableExercisesToTrack.length === 0 ? (
              <p className="text-xs text-noir-text-muted italic text-center py-4">All your exercises are already added.</p>
            ) : filteredExercisesToTrack.length === 0 ? (
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest text-center py-4">No exercises found.</p>
            ) : (
              filteredExercisesToTrack.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    addTrackedLift({
                      id: ex.id,
                      name: ex.name,
                      muscle: "Custom",
                      color: "#CCFF00"
                    });
                    setIsAddModalOpen(false);
                    setSearchQuery("");
                    setMuscleFilter(null);
                    showToast("PR Added!");
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 transition-colors group flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-sm text-zinc-300 group-hover:text-white">{ex.name?.trim() ? ex.name : "Unknown Lift"}</p>
                    {(ex as any).t !== "Unknown" && (
                      <span className="text-[9px] font-bold text-noir-accent bg-noir-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block">{(ex as any).t}</span>
                    )}
                  </div>
                  <Plus size={16} className="text-zinc-600 group-hover:text-noir-accent" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* Toast Notification */}
    {toastMsg && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in">
        <div className="bg-noir-accent text-black px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm uppercase tracking-widest">
          <Check size={16} /> {toastMsg}
        </div>
      </div>
    )}
    </>
  );
}
