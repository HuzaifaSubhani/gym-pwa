"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Dumbbell, Medal, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position?: number;
};

type WorkoutLog = {
  user_id: string;
  date_str: string;
  exercise_id: string;
  logs: any[];
};

type LeaderboardEntry = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position?: number;
  score: number;
  workouts: number;
  totalVolume: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch profiles
      const { data: profiles } = await supabase.from("profiles").select("*");
      // Fetch workout logs for the current week (simplified to all logs for MVP)
      const { data: logs } = await supabase.from("workout_logs").select("*");

      if (profiles && logs) {
        const currentUserProfile = profiles.find(p => p.id === user?.id);
        if (currentUserProfile) {
          setMyProfile(currentUserProfile);
        }

        const userStats: Record<string, { workouts: Set<string>, volume: number }> = {};
        
        profiles.forEach(p => {
          userStats[p.id] = { workouts: new Set(), volume: 0 };
        });

        logs.forEach((log: WorkoutLog) => {
          if (!userStats[log.user_id]) return;
          
          userStats[log.user_id].workouts.add(log.date_str);
          
          // Calculate volume for this log
          let logVolume = 0;
          log.logs.forEach((set: any) => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            logVolume += weight * reps;
            
            // Add dropset volume if any
            if (set.drops) {
              set.drops.forEach((drop: any) => {
                const dropWeight = parseFloat(drop.weight) || 0;
                const dropReps = parseInt(drop.reps) || 0;
                logVolume += dropWeight * dropReps;
              });
            }
          });
          
          userStats[log.user_id].volume += logVolume;
        });

        const calculatedEntries: LeaderboardEntry[] = profiles.map(p => {
          const stats = userStats[p.id];
          const workoutsCount = stats.workouts.size;
          // Simple scoring algorithm: volume / 100 + (workouts * 50)
          const score = Math.round((stats.volume / 100) + (workoutsCount * 50));
          
          return {
            id: p.id,
            username: p.username || "Gym Bro",
            avatar_url: p.avatar_url,
            avatar_position: p.avatar_position ?? 50,
            score,
            workouts: workoutsCount,
            totalVolume: Math.round(stats.volume)
          };
        });

        // Sort by score descending
        calculatedEntries.sort((a, b) => b.score - a.score);
        setEntries(calculatedEntries);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-noir-text-muted animate-in fade-in">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading Leaderboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-noir-surface border border-noir-border rounded-xl p-8 text-center shadow-lg animate-in fade-in zoom-in-95 mt-6">
        <Trophy className="mx-auto mb-4 text-noir-accent opacity-50" size={48} />
        <h2 className="text-2xl font-black mb-2">Join the Squad</h2>
        <p className="text-noir-text-muted mb-6 text-sm">Log in to track your progress against your buddies and climb the leaderboard.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-noir-accent hover:bg-[#2cff05] text-noir-bg font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all">
          Login / Sign Up <ArrowRight size={18} />
        </Link>
      </div>
    );
  }



  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-6 px-2 flex justify-between items-end">
        <div>
          <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Competition</h2>
          <h1 className="text-3xl font-black flex items-center gap-3">
            Squad <Trophy className="text-amber-400" size={28} />
          </h1>
        </div>
      </header>

      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border">
            <p className="text-noir-text-muted">No one has logged any workouts yet. Be the first!</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrentUser = entry.id === user?.id;
            
            return (
              <div 
                key={entry.id} 
                className={`relative flex items-center p-4 rounded-xl border transition-all ${
                  isCurrentUser 
                    ? "bg-noir-accent/10 border-noir-accent shadow-[0_0_15px_rgba(57,255,20,0.1)]" 
                    : "bg-noir-surface border-noir-border"
                }`}
              >
                <div className="flex-shrink-0 w-10 text-center font-black text-xl">
                  {index === 0 ? <Medal className="mx-auto text-amber-400" size={24} /> : 
                   index === 1 ? <Medal className="mx-auto text-slate-300" size={24} /> : 
                   index === 2 ? <Medal className="mx-auto text-amber-700" size={24} /> : 
                   <span className="text-noir-text-muted">#{index + 1}</span>}
                </div>
                
                <div className="flex-1 ml-4 flex items-center gap-3">
                  {entry.avatar_url ? (
                    <img 
                      src={entry.avatar_url} 
                      alt="DP" 
                      style={{ objectPosition: `50% ${entry.avatar_position}%` }}
                      className="w-10 h-10 rounded-full border border-noir-border object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center text-xs font-bold text-noir-text-muted">
                      {entry.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className={`font-bold text-lg leading-tight ${isCurrentUser ? "text-noir-accent" : ""}`}>
                      {entry.username} {isCurrentUser && "(You)"}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] uppercase text-noir-text-muted mt-1 font-bold tracking-wider">
                      <span className="flex items-center gap-1"><Dumbbell size={10} /> {entry.workouts} WOs</span>
                      <span>{entry.totalVolume.toLocaleString()} kg vol</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-black">{entry.score.toLocaleString()}</div>
                  <div className="text-[10px] uppercase font-bold text-noir-text-muted tracking-widest">Score</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
