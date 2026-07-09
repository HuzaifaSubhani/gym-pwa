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
  xp: number;
  level: number;
  progress: number;
  workouts: number;
  totalVolume: number;
  score: number;
};

function getLevelInfo(volume: number) {
  const xp = Math.round(volume / 10);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelXP = 100 * Math.pow(level - 1, 2);
  const nextLevelXP = 100 * Math.pow(level, 2);
  
  let progress = 0;
  if (nextLevelXP > currentLevelXP) {
    progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  }
  
  return { xp, level, progress: Math.min(100, Math.max(0, progress)) };
}

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
          const stats = userStats[p.id] || { workouts: new Set(), volume: 0 };
          const workoutsCount = stats.workouts.size;
          
          const { xp, level, progress } = getLevelInfo(stats.volume);
          
          return {
            id: p.id,
            username: p.username || "Gym Bro",
            avatar_url: p.avatar_url,
            avatar_position: p.avatar_position ?? 50,
            xp,
            level,
            progress,
            workouts: workoutsCount,
            totalVolume: Math.round(stats.volume),
            score: xp + (workoutsCount * 50)
          };
        });

        // Sort by Score descending
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
                
                <div className="flex-1 ml-4 flex items-center gap-3 w-full">
                  {entry.avatar_url ? (
                    <img 
                      src={entry.avatar_url} 
                      alt="DP" 
                      style={{ objectPosition: `50% ${entry.avatar_position}%` }}
                      className="w-12 h-12 rounded-full border-2 border-noir-border object-cover flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-noir-bg border-2 border-noir-border flex items-center justify-center text-sm font-bold text-noir-text-muted flex-shrink-0">
                      {entry.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-bold text-base md:text-lg leading-tight truncate pr-2 ${isCurrentUser ? "text-noir-accent" : ""}`}>
                        {entry.username} {isCurrentUser && "(You)"}
                      </h3>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg md:text-xl font-black text-noir-accent">Lvl {entry.level}</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-noir-bg rounded-full overflow-hidden border border-noir-border/50 mb-1">
                      <div 
                        className="h-full bg-noir-accent transition-all duration-1000 ease-out relative" 
                        style={{ width: `${entry.progress}%` }}
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent to-white/30"></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] md:text-[10px] uppercase font-bold text-noir-text-muted tracking-wider">
                      <span className="flex items-center gap-1"><Dumbbell size={10} /> {entry.workouts} WOs</span>
                      <span>{entry.score.toLocaleString()} SCORE</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
