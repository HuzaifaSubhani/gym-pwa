"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Dumbbell, Medal, Loader2, ArrowRight, Swords, Check, X, Flame, ChevronDown, ChevronUp } from "lucide-react";
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
  physique_tag: string;
  pinned_pr?: any;
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

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [forfeitPrompt, setForfeitPrompt] = useState<{id: string, opponentName: string, opponentId: string} | null>(null);
  const [isWarsExpanded, setIsWarsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState("overall");

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async (forceRefetch = false) => {
    if (!forceRefetch && cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
      setEntries(cachedData.entries);
      setChallenges(cachedData.challenges);
      setUser(cachedData.user);
      setMyProfile(cachedData.myProfile);
      setLoading(false);
      return;
    }
    
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

      const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      logs.forEach((log: WorkoutLog) => {
        if (!userStats[log.user_id]) return;
        
        // Don't count future workouts for stats
        if (log.date_str > todayStr) return;
        
        let logVolume = 0;
        let hasValidSets = false;
        
        log.logs.forEach((set: any) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          
          if (weight > 0 || reps > 0) hasValidSets = true;
          
          logVolume += weight * reps;
          if (set.drops) {
            set.drops.forEach((drop: any) => {
              const dropWeight = parseFloat(drop.weight) || 0;
              const dropReps = parseInt(drop.reps) || 0;
              
              if (dropWeight > 0 || dropReps > 0) hasValidSets = true;
              
              logVolume += dropWeight * dropReps;
            });
          }
        });
        
        if (hasValidSets) {
          userStats[log.user_id].workouts.add(log.date_str);
        }
        
        userStats[log.user_id].logs.push(log);
        userStats[log.user_id].volume += logVolume;
      });

      // Enhance challenges with profiles and calculate active volumes
      let enhancedChallenges: any[] = [];
      if (currentUser) {
        enhancedChallenges = fetchedChallenges.map(c => {
          const isChallenger = c.challenger_id === currentUser.id;
          const opponentId = isChallenger ? c.challenged_id : c.challenger_id;
          const opponentProfile = profiles.find(p => p.id === opponentId);
          
          let myVolume = 0;
          let theirVolume = 0;
          
          if (c.status === 'active' && c.start_date) {
            const startDate = new Date(c.start_date);
            startDate.setHours(0, 0, 0, 0);
            const start = startDate.getTime();
            
            const endDate = c.end_date ? new Date(c.end_date) : new Date(start + (7 * 24 * 60 * 60 * 1000));
            endDate.setHours(23, 59, 59, 999);
            const end = endDate.getTime();
            
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
          score: xp + (workoutsCount * 50),
          physique_tag: p.physique_tag || "overall",
          pinned_pr: p.pinned_pr
        };
      });

      calculatedEntries.sort((a, b) => b.score - a.score);
      setEntries(calculatedEntries);
      
      // Update cache
      cachedData = {
        entries: calculatedEntries,
        challenges: enhancedChallenges,
        user: currentUser,
        myProfile: currentUserProfile || null
      };
      cacheTime = Date.now();
    }
    setLoading(false);
  };

  const calcVolumeInWindow = (logs: WorkoutLog[], startMs: number, endMs: number) => {
    let vol = 0;
    logs.forEach(log => {
      const [y, m, d] = log.date_str.split('-');
      const logDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
      // If log date is within window
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
      await fetchLeaderboardData(true);
    }
    setActionLoading(null);
  };

  const acceptChallenge = async (challengeId: string) => {
    setActionLoading(`accept-${challengeId}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endDate = new Date(tomorrow.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
    
    await supabase.from('challenges').update({
      status: 'active',
      start_date: tomorrow.toISOString(),
      end_date: endDate.toISOString()
    }).eq('id', challengeId);
    
    await fetchLeaderboardData(true);
    setActionLoading(null);
  };

  const declineChallenge = async (challengeId: string) => {
    setActionLoading(`decline-${challengeId}`);
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
    await fetchLeaderboardData(true);
    setActionLoading(null);
  };

  const revokeChallenge = async (challengeId: string) => {
    setActionLoading(`revoke-${challengeId}`);
    // Instead of deleting (which may hit RLS), we decline/revoke it
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
    await fetchLeaderboardData(true);
    setActionLoading(null);
  };

  const executeForfeit = async () => {
    if (!forfeitPrompt) return;
    setActionLoading(`forfeit-${forfeitPrompt.id}`);
    await supabase.from('challenges').update({ status: 'completed', winner_id: forfeitPrompt.opponentId }).eq('id', forfeitPrompt.id);
    await fetchLeaderboardData(true);
    setActionLoading(null);
    setForfeitPrompt(null);
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
        <Link href="/login" className="inline-flex items-center gap-2 bg-noir-accent hover:opacity-90 text-noir-bg font-bold py-3 px-6 rounded-lg shadow-lg transition-all">
          Join the Forge <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const pendingReceived = challenges.filter(c => c.status === 'pending' && c.challenged_id === user.id);
  const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_id === user.id);
  const activeChallenges = challenges.filter(c => c.status === 'active' && (c.challenger_id === user.id || c.challenged_id === user.id));
  const completedChallenges = challenges.filter(c => c.status === 'completed' && (c.challenger_id === user.id || c.challenged_id === user.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-4 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Competition</h2>
        <h1 className="text-3xl font-black flex items-center gap-3 mb-4">
          Ranks <Trophy className="text-amber-400" size={28} />
        </h1>
        
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {[
            { id: 'overall', label: 'Overall' },
            { id: 'classic', label: 'Classic' },
            { id: 'aesthetic', label: 'Aesthetic' },
            { id: 'powerlifting', label: 'Powerlifting' }
          ].map(tag => (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(tag.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
                activeFilter === tag.id
                  ? 'bg-noir-accent text-black border-noir-accent'
                  : 'bg-noir-surface border-noir-border text-noir-text-muted hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </header>

      {/* Challenges Section */}
      {(pendingReceived.length > 0 || pendingSent.length > 0 || activeChallenges.length > 0 || completedChallenges.length > 0) && (
        <div className="bg-noir-bg border border-noir-border rounded-xl shadow-lg overflow-hidden">
          <button 
            onClick={() => setIsWarsExpanded(!isWarsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-noir-surface hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-2">
              <Swords size={20} className={activeChallenges.length > 0 ? "text-red-500" : "text-noir-text-muted"} /> 
              <h3 className="text-lg font-black text-white">Wars Overview</h3>
              {(pendingReceived.length > 0 || activeChallenges.length > 0) && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">
                  {pendingReceived.length + activeChallenges.length} Active
                </span>
              )}
            </div>
            {isWarsExpanded ? <ChevronUp size={20} className="text-noir-text-muted" /> : <ChevronDown size={20} className="text-noir-text-muted" />}
          </button>
          
          {isWarsExpanded && (
            <div className="p-4 space-y-6 border-t border-noir-border">
              {/* Active & Pending Section */}
              {(pendingReceived.length > 0 || activeChallenges.length > 0 || pendingSent.length > 0) && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-noir-text-muted uppercase tracking-widest px-1">Current Battles</h4>
          
          {/* Incoming Challenges */}
          {pendingReceived.map(c => (
            <div key={c.id} className="bg-noir-surface border border-noir-accent/50 rounded-xl p-4 shadow-lg">
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

          {/* Outgoing Challenges */}
          {pendingSent.map(c => (
            <div key={c.id} className="bg-noir-surface border border-noir-border rounded-xl p-4 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-noir-text-muted">Pending Challenge</span>
                  <p className="text-sm">You challenged <span className="font-bold">{c.challenged_profile?.username}</span>.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => revokeChallenge(c.id)}
                  disabled={actionLoading !== null}
                  className="px-4 w-full bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 rounded-lg py-2 font-bold flex items-center justify-center transition-colors text-xs uppercase tracking-widest"
                >
                  {actionLoading === `revoke-${c.id}` ? <Loader2 size={16} className="animate-spin mr-1" /> : <X size={16} className="mr-1" />} Revoke Challenge
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

            const isStartingTomorrow = c.start_date ? new Date().getTime() < new Date(c.start_date).getTime() : false;

            return (
              <div key={c.id} className="bg-noir-surface border border-red-500/30 rounded-xl p-4 shadow-lg overflow-hidden relative">
                
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Swords size={18} className="text-red-500" />
                    <span className="font-bold">vs {opponent?.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-noir-text-muted bg-noir-bg px-2 py-1 rounded-md border border-noir-border">
                      {isStartingTomorrow ? 'Starting Tomorrow' : daysLeft > 0 ? `${daysLeft} Days Left` : 'Ending Soon'}
                    </div>
                    <button 
                      onClick={() => setForfeitPrompt({id: c.id, opponentName: opponent?.username || "Opponent", opponentId: opponent?.id || ""})}
                      disabled={actionLoading === `forfeit-${c.id}`}
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                      title="Forfeit Challenge"
                    >
                      {actionLoading === `forfeit-${c.id}` ? '...' : 'Forfeit'}
                    </button>
                  </div>
                </div>

                {isStartingTomorrow ? (
                  <div className="text-center py-2 text-sm text-noir-text-muted italic">
                    Rest up. War begins tomorrow.
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Past Wars */}
      {completedChallenges.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-noir-text-muted uppercase tracking-widest px-1 border-t border-noir-border/50 pt-4 mt-2">Past Wars</h4>
          {completedChallenges.map(c => {
            const isChallenger = c.challenger_id === user.id;
            const opponent = isChallenger ? c.challenged_profile : c.challenger_profile;
            const iWon = c.winner_id === user.id;
            
            return (
              <div key={c.id} className="bg-noir-surface border border-noir-border rounded-xl p-4 shadow-lg opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-bold">vs {opponent?.username}</div>
                  <div className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded ${iWon ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                    {iWon ? 'Victory' : 'Defeat'}
                  </div>
                </div>
                <div className="text-xs text-noir-text-muted italic">
                  {iWon ? 'You crushed them.' : `${opponent?.username} won this war.`}
                </div>
              </div>
            );
          })}
        </div>
      )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-noir-surface/40 backdrop-blur-sm border border-noir-border rounded-xl shadow-lg p-4 pb-2">
        <div className="flex items-center justify-between text-xs font-bold text-noir-text-muted uppercase tracking-widest px-4 pb-3 border-b border-noir-border/50 mb-3">
          <span>Rank</span>
          <span>Score</span>
        </div>
        <div className="space-y-2">
          {entries
            .filter(entry => activeFilter === "overall" || entry.physique_tag === activeFilter)
            .map((entry, index) => {
            const isCurrentUser = entry.id === user?.id;
            // Check if there's an existing challenge with this user
            const existingChallenge = challenges.find(c => 
              (c.challenger_id === entry.id || c.challenged_id === entry.id) && 
              (c.status === 'pending' || c.status === 'active')
            );
            
            const isTop3 = index < 3;
            const rankColors = [
              "from-amber-400/20 to-amber-600/5 border-amber-400/50 text-amber-400", // 1st
              "from-slate-300/20 to-slate-500/5 border-slate-300/50 text-slate-300", // 2nd
              "from-amber-700/20 to-amber-900/5 border-amber-700/50 text-amber-600"  // 3rd
            ];
            
            const rankStyle = isTop3 ? rankColors[index] : (isCurrentUser ? "bg-noir-accent/10 border-noir-accent/50" : "bg-noir-surface border-noir-border/50");

            return (
              <div 
                key={entry.id} 
                onClick={() => setSelectedUser(entry)}
                className={`relative flex items-center p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] shadow-lg ${rankStyle} ${isTop3 ? 'bg-gradient-to-br' : ''}`}
              >
                <div className="flex-shrink-0 w-12 text-center flex justify-center">
                  {index === 0 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-amber-900 font-black text-lg border-2 border-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] shadow-inner">1</div>
                  ) : index === 1 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-800 font-black text-lg border-2 border-slate-100 drop-shadow-[0_0_8px_rgba(203,213,225,0.8)] shadow-inner">2</div>
                  ) : index === 2 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 font-black text-lg border-2 border-amber-500 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)] shadow-inner">3</div>
                  ) : (
                    <span className="text-noir-text-muted font-black text-xl">#{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 ml-3 flex items-center gap-4 w-full">
                  <div className="relative">
                    {entry.avatar_url ? (
                      <img 
                        src={entry.avatar_url} 
                        alt="DP" 
                        style={{ objectPosition: `50% ${entry.avatar_position}%` }}
                        className={`w-14 h-14 rounded-full border-2 object-cover flex-shrink-0 shadow-inner ${isTop3 ? 'border-transparent' : 'border-noir-border'}`} 
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 shadow-inner border-2 ${isTop3 ? 'border-transparent bg-black/40 text-white' : 'bg-noir-bg border-noir-border text-noir-text-muted'}`}>
                        {entry.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isTop3 && (
                      <div className="absolute inset-0 rounded-full border-2 border-current opacity-50" style={{ color: 'inherit' }}></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-end mb-1.5">
                      <div className="flex flex-col gap-0.5">
                        <h3 className={`font-black text-lg truncate tracking-tight ${isCurrentUser ? "text-noir-accent" : "text-white"}`}>
                          {entry.username} {isCurrentUser && <span className="text-[10px] font-bold uppercase tracking-widest text-noir-text-muted ml-1">(You)</span>}
                        </h3>
                        {entry.pinned_pr && (
                          <div className="flex items-center gap-1 bg-noir-accent/10 border border-noir-accent/30 text-noir-accent px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest w-fit">
                            <Trophy size={10} /> {entry.pinned_pr.name}: {entry.pinned_pr.weight}kg
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 flex items-baseline gap-1">
                        <span className="text-[10px] text-noir-text-muted font-bold uppercase tracking-widest">Lvl</span>
                        <span className="text-xl font-black text-white">{entry.level}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 mb-1.5 shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out relative ${isTop3 ? 'bg-current' : 'bg-noir-accent'}`} 
                        style={{ width: `${entry.progress}%` }}
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent to-white/30"></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-noir-text-muted tracking-widest mt-0.5">
                      <span className="flex items-center gap-1.5"><Dumbbell size={12} className={isTop3 ? 'text-current opacity-70' : ''} /> {entry.workouts} WOs</span>
                      <span className="flex items-center gap-1">SCORE: <span className="text-white">{entry.score.toLocaleString()}</span></span>
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
        }
        </div>
      </div>
      
      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedUser(null)}>
          <div className="bg-noir-surface border border-noir-border rounded-2xl p-6 shadow-2xl w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-2 bg-noir-bg rounded-full border border-noir-border hover:text-noir-accent"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-center mt-2">
              {selectedUser.avatar_url ? (
                <img 
                  src={selectedUser.avatar_url} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full border-2 border-noir-accent object-cover shadow-lg mb-4"
                  style={{ objectPosition: `50% ${selectedUser.avatar_position}%` }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-noir-bg border-2 border-noir-border flex items-center justify-center text-3xl font-black text-noir-text-muted mb-4 shadow-lg">
                  {selectedUser.username.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 className="text-2xl font-black mb-1 text-white">{selectedUser.username}</h2>
              
              {selectedUser.pinned_pr && (
                <div className="mt-2 mb-4 inline-flex items-center gap-2 bg-noir-bg border border-noir-accent/30 text-noir-accent px-3 py-1.5 rounded-full shadow-lg">
                  <Trophy size={14} className="animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {selectedUser.pinned_pr.name}: <span className="text-white">{selectedUser.pinned_pr.weight}kg × {selectedUser.pinned_pr.reps}</span>
                  </span>
                </div>
              )}

              <div className="text-sm font-bold text-noir-accent uppercase tracking-widest mb-6">Level {selectedUser.level}</div>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-noir-bg rounded-xl p-3 border border-noir-border/50 text-center">
                  <div className="text-[10px] text-noir-text-muted uppercase font-bold tracking-wider mb-1">XP</div>
                  <div className="text-xl font-black text-white">{selectedUser.xp}</div>
                </div>
                <div className="bg-noir-bg rounded-xl p-3 border border-noir-border/50 text-center">
                  <div className="text-[10px] text-noir-text-muted uppercase font-bold tracking-wider mb-1">Workouts</div>
                  <div className="text-xl font-black text-white">{selectedUser.workouts}</div>
                </div>
                <div className="bg-noir-bg rounded-xl p-3 border border-noir-border/50 text-center col-span-2">
                  <div className="text-[10px] text-noir-text-muted uppercase font-bold tracking-wider mb-1">Total Volume Logged</div>
                  <div className="text-xl font-black text-noir-accent">{selectedUser.totalVolume.toLocaleString()} kg</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Modal */}
      {forfeitPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setForfeitPrompt(null)}>
          <div className="bg-noir-surface border border-red-500/50 rounded-2xl p-6 shadow-2xl w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-white mb-2">Forfeit War?</h2>
            <p className="text-noir-text-muted mb-6">
              Are you sure you want to surrender to <span className="font-bold text-white">{forfeitPrompt.opponentName}</span>? They will be declared the winner immediately and your shame will be recorded.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setForfeitPrompt(null)}
                className="flex-1 bg-noir-bg border border-noir-border text-white font-bold py-3 rounded-lg hover:bg-noir-surface-light transition-colors"
              >
                Nevermind
              </button>
              <button 
                onClick={executeForfeit}
                disabled={actionLoading !== null}
                className="flex-1 bg-red-900/40 border border-red-500 text-red-500 font-black uppercase tracking-widest py-3 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Surrender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
