"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Dumbbell, Medal, Loader2, ArrowRight, Swords, Check, X, Flame } from "lucide-react";
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

type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  start_date: string | null;
  end_date: string | null;
  winner_id: string | null;
  challenger_profile?: Profile;
  challenged_profile?: Profile;
  myVolume?: number;
  theirVolume?: number;
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
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    // Fetch profiles
    const { data: profiles } = await supabase.from("profiles").select("*");
    // Fetch workout logs
    const { data: logs } = await supabase.from("workout_logs").select("*");
    
    let fetchedChallenges: Challenge[] = [];
    if (currentUser) {
      // Fetch challenges if logged in
      const { data: cData } = await supabase
        .from("challenges")
        .select("*")
        .or(`challenger_id.eq.${currentUser.id},challenged_id.eq.${currentUser.id}`);
      
      if (cData) {
        fetchedChallenges = cData;
      }
    }

    if (profiles && logs) {
      const currentUserProfile = profiles.find(p => p.id === currentUser?.id);
      if (currentUserProfile) {
        setMyProfile(currentUserProfile);
      }

      const userStats: Record<string, { workouts: Set<string>, volume: number, logs: WorkoutLog[] }> = {};
      
      profiles.forEach(p => {
        userStats[p.id] = { workouts: new Set(), volume: 0, logs: [] };
      });

      logs.forEach((log: WorkoutLog) => {
        if (!userStats[log.user_id]) return;
        
        userStats[log.user_id].workouts.add(log.date_str);
        userStats[log.user_id].logs.push(log);
        
        // Calculate volume for this log
        let logVolume = 0;
        log.logs.forEach((set: any) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          logVolume += weight * reps;
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

      // Enhance challenges with profiles and calculate active volumes
      if (currentUser) {
        const enhancedChallenges = fetchedChallenges.map(c => {
          const isChallenger = c.challenger_id === currentUser.id;
          const opponentId = isChallenger ? c.challenged_id : c.challenger_id;
          const opponentProfile = profiles.find(p => p.id === opponentId);
          
          let myVolume = 0;
          let theirVolume = 0;
          
          if (c.status === 'active' && c.start_date) {
            const start = new Date(c.start_date).getTime();
            const end = c.end_date ? new Date(c.end_date).getTime() : start + (7 * 24 * 60 * 60 * 1000);
            
            // Calc my volume in window
            const myLogs = userStats[currentUser.id]?.logs || [];
            myVolume = calcVolumeInWindow(myLogs, start, end);
            
            // Calc their volume in window
            const theirLogs = userStats[opponentId]?.logs || [];
            theirVolume = calcVolumeInWindow(theirLogs, start, end);
          }
          
          return {
            ...c,
            challenger_profile: profiles.find(p => p.id === c.challenger_id),
            challenged_profile: profiles.find(p => p.id === c.challenged_id),
            myVolume,
            theirVolume
          };
        });
        setChallenges(enhancedChallenges);
      }

      const calculatedEntries: LeaderboardEntry[] = profiles.map(p => {
        const stats = userStats[p.id] || { workouts: new Set(), volume: 0, logs: [] };
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

      calculatedEntries.sort((a, b) => b.score - a.score);
      setEntries(calculatedEntries);
    }
    setLoading(false);
  };

  const calcVolumeInWindow = (logs: WorkoutLog[], startMs: number, endMs: number) => {
    let vol = 0;
    logs.forEach(log => {
      const logDate = new Date(log.date_str).getTime();
      // If log date is within window (ignoring time of day for simplicity, or we assume date_str is YYYY-MM-DD)
      if (logDate >= startMs && logDate <= endMs) {
        log.logs.forEach((set: any) => {
          vol += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
          if (set.drops) {
            set.drops.forEach((drop: any) => {
              vol += (parseFloat(drop.weight) || 0) * (parseInt(drop.reps) || 0);
            });
          }
        });
      }
    });
    return vol;
  };

  const sendChallenge = async (opponentId: string) => {
    if (!user) return;
    setActionLoading(`challenge-${opponentId}`);
    
    // Check if table exists (graceful degradation if user didn't run SQL)
    const { error } = await supabase.from('challenges').insert({
      challenger_id: user.id,
      challenged_id: opponentId,
      status: 'pending'
    });
    
    if (error) {
      console.error(error);
      alert("Failed to send challenge. Did you run the SQL script to create the table?");
    } else {
      await fetchLeaderboardData();
    }
    setActionLoading(null);
  };

  const acceptChallenge = async (challengeId: string) => {
    setActionLoading(`accept-${challengeId}`);
    const now = new Date();
    const endDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    await supabase.from('challenges').update({
      status: 'active',
      start_date: now.toISOString(),
      end_date: endDate.toISOString()
    }).eq('id', challengeId);
    
    await fetchLeaderboardData();
    setActionLoading(null);
  };

  const declineChallenge = async (challengeId: string) => {
    setActionLoading(`decline-${challengeId}`);
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
    await fetchLeaderboardData();
    setActionLoading(null);
  };

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
        <Link href="/login" className="inline-flex items-center gap-2 bg-noir-accent hover:opacity-90 text-noir-bg font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(167,139,250,0.3)] transition-all">
          Join the Forge <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const pendingReceived = challenges.filter(c => c.status === 'pending' && c.challenged_id === user.id);
  const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_id === user.id);
  const activeChallenges = challenges.filter(c => c.status === 'active');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-4 px-2 flex justify-between items-end">
        <div>
          <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Competition</h2>
          <h1 className="text-3xl font-black flex items-center gap-3">
            Ranks <Trophy className="text-amber-400" size={28} />
          </h1>
        </div>
      </header>

      {/* Challenges Section */}
      {(pendingReceived.length > 0 || activeChallenges.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2 px-2"><Swords size={20} className="text-red-500" /> Active Wars</h3>
          
          {/* Incoming Challenges */}
          {pendingReceived.map(c => (
            <div key={c.id} className="bg-noir-surface border border-noir-accent/50 rounded-xl p-4 shadow-[0_0_15px_rgba(167,139,250,0.1)]">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-noir-accent animate-pulse">Incoming Challenge!</span>
                  <p className="text-sm"><span className="font-bold">{c.challenger_profile?.username}</span> has challenged you to a 7-day Volume War.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => acceptChallenge(c.id)}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-green-500/20 text-green-500 border border-green-500/50 hover:bg-green-500/30 rounded-lg py-2 font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  {actionLoading === `accept-${c.id}` ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Accept
                </button>
                <button 
                  onClick={() => declineChallenge(c.id)}
                  disabled={actionLoading !== null}
                  className="px-4 bg-noir-bg border border-noir-border text-noir-text-muted hover:text-red-500 rounded-lg py-2 font-bold flex items-center justify-center transition-colors"
                >
                  {actionLoading === `decline-${c.id}` ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                </button>
              </div>
            </div>
          ))}

          {/* Active Challenges */}
          {activeChallenges.map(c => {
            const isChallenger = c.challenger_id === user.id;
            const opponent = isChallenger ? c.challenged_profile : c.challenger_profile;
            const myVol = c.myVolume || 0;
            const theirVol = c.theirVolume || 0;
            const total = myVol + theirVol || 1; // Prevent div by 0
            const myPercent = (myVol / total) * 100;
            
            const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 7;

            return (
              <div key={c.id} className="bg-noir-surface border border-red-500/30 rounded-xl p-4 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px] rounded-full pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Swords size={18} className="text-red-500" />
                    <span className="font-bold">vs {opponent?.username}</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-noir-text-muted bg-noir-bg px-2 py-1 rounded-md border border-noir-border">
                    {daysLeft > 0 ? `${daysLeft} Days Left` : 'Ending Soon'}
                  </div>
                </div>

                {/* VS Bar */}
                <div className="relative h-6 bg-noir-bg rounded-lg overflow-hidden border border-noir-border flex mb-2">
                  <div className="h-full bg-noir-accent transition-all duration-1000" style={{ width: `${myPercent}%` }}></div>
                  <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${100 - myPercent}%` }}></div>
                  
                  {/* Lightning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Flame size={14} className="text-white drop-shadow-md" />
                  </div>
                </div>
                
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-noir-accent">You: {myVol.toLocaleString()} kg</span>
                  <span className="text-red-500">{opponent?.username}: {theirVol.toLocaleString()} kg</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border">
            <p className="text-noir-text-muted">No one has logged any workouts yet. Be the first!</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrentUser = entry.id === user?.id;
            // Check if there's an existing challenge with this user
            const existingChallenge = challenges.find(c => 
              (c.challenger_id === entry.id || c.challenged_id === entry.id) && 
              (c.status === 'pending' || c.status === 'active')
            );
            
            return (
              <div 
                key={entry.id} 
                className={`relative flex items-center p-4 rounded-xl border transition-all ${
                  isCurrentUser 
                    ? "bg-noir-accent/10 border-noir-accent shadow-[0_0_15px_rgba(167,139,250,0.1)]" 
                    : "bg-noir-surface border-noir-border hover:border-noir-border/80"
                }`}
              >
                <div className="flex-shrink-0 w-10 text-center font-black text-xl">
                  {index === 0 ? <Medal className="mx-auto text-amber-400" size={24} /> : 
                   index === 1 ? <Medal className="mx-auto text-slate-300" size={24} /> : 
                   index === 2 ? <Medal className="mx-auto text-amber-700" size={24} /> : 
                   <span className="text-noir-text-muted">#{index + 1}</span>}
                </div>
                
                <div className="flex-1 ml-2 flex items-center gap-3 w-full">
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
                    
                    <div className="flex justify-between items-center text-[9px] md:text-[10px] uppercase font-bold text-noir-text-muted tracking-wider mt-1">
                      <span className="flex items-center gap-1"><Dumbbell size={10} /> {entry.workouts} WOs</span>
                      <span>{entry.score.toLocaleString()} SCORE</span>
                    </div>
                  </div>
                </div>

                {/* Challenge Action Button */}
                {!isCurrentUser && (
                  <div className="ml-3 flex-shrink-0 flex items-center">
                    {existingChallenge ? (
                      <div className="text-[9px] uppercase font-bold text-noir-text-muted bg-noir-bg px-2 py-1 rounded border border-noir-border text-center leading-tight">
                        {existingChallenge.status === 'active' ? 'At War' : 'Pending'}
                      </div>
                    ) : (
                      <button 
                        onClick={() => sendChallenge(entry.id)}
                        disabled={actionLoading !== null}
                        className="w-8 h-8 rounded-full bg-noir-bg border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                        title="Challenge to a Volume War"
                      >
                        {actionLoading === `challenge-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
