"use client";

import { useState, useEffect } from "react";
import WorkoutLogger from "@/components/WorkoutLogger";
import ProgressAnalytics from "@/components/ProgressAnalytics";
import Dashboard from "@/components/Dashboard";
import Leaderboard from "@/components/Leaderboard";
import Profile from "@/components/Profile";
import CommunityPrograms from "@/components/CommunityPrograms";
import { Home as HomeIcon, Dumbbell, Trophy, User, CalendarDays, Loader2, Globe } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { getCurrentProtocolDateInfo } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "workout" | "leaderboard" | "explore" | "profile">("dashboard");
  const { state, setActiveWeekDay, syncWithUser } = useProtocol();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [username, setUsername] = useState("Athlete");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        // Fetch from profile to ensure we get it even if user_metadata is stale
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
        
        if (profile?.username) {
          setUsername(profile.username);
        } else if (session.user.user_metadata?.username) {
          setUsername(session.user.user_metadata.username);
        }

        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Now that they are logged in, initialize their specific local store
        syncWithUser(session.user.id);
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sync current actual date on load to ensure active week/day are accurate based on the timeline
    const { currentWeek, currentDayOfWeek } = getCurrentProtocolDateInfo();
    // Only update if they differ to avoid unnecessary renders
    if (state.activeWeek !== currentWeek || state.activeDayOfWeek !== currentDayOfWeek) {
      setActiveWeekDay(currentWeek, currentDayOfWeek);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoadingAuth) {
    return (
      <main className="flex-1 flex flex-col h-[100dvh] items-center justify-center bg-noir-bg">
        <Loader2 className="animate-spin text-noir-accent mb-4" size={32} />
        <p className="text-noir-text-muted font-bold tracking-widest uppercase text-xs">Authenticating...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-noir-bg relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none fixed"></div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 md:px-8 max-w-3xl mx-auto w-full relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        


        <div className={activeTab === "dashboard" ? "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out block" : "hidden"}>
          <Dashboard avatarUrl={avatarUrl} username={username} onStartWorkout={() => setActiveTab("workout")} />
          <ProgressAnalytics />
        </div>
        <div className={activeTab === "workout" ? "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out block" : "hidden"}>
          <WorkoutLogger />
        </div>
        <div className={activeTab === "leaderboard" ? "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out block" : "hidden"}>
          <Leaderboard />
        </div>
        <div className={activeTab === "explore" ? "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out block" : "hidden"}>
          <CommunityPrograms />
        </div>
        <div className={activeTab === "profile" ? "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out block" : "hidden"}>
          <Profile />
        </div>
      </div>

      {/* Bottom Navigation for mobile-first usage */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto bg-noir-surface/80 backdrop-blur-xl border-t border-noir-border pb-safe pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex relative">
            {/* Animated Glow Indicator */}
            <div
              className="absolute top-0 h-[2px] bg-noir-accent transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full shadow-[0_0_12px_2px_rgba(204,255,0,0.5)]"
              style={{
                width: '20%',
                left: `${["dashboard", "workout", "leaderboard", "explore", "profile"].indexOf(activeTab) * 20}%`,
              }}
            />

          {[
            { id: "dashboard" as const, icon: <HomeIcon size={22} />, label: "Home" },
            { id: "workout" as const, icon: <Dumbbell size={22} />, label: "Train" },
            { id: "leaderboard" as const, icon: <Trophy size={22} />, label: "Ranks" },
            { id: "explore" as const, icon: <Globe size={22} />, label: "Explore" },
            { id: "profile" as const, icon: avatarUrl ? <img src={avatarUrl} alt="You" className={`w-6 h-6 rounded-full border object-cover transition-all duration-300 ${activeTab === "profile" ? "border-noir-accent shadow-[0_0_8px_rgba(204,255,0,0.5)]" : "border-noir-border"}`} /> : <User size={22} />, label: "You" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3.5 gap-1 transition-all duration-300 ease-out relative ${
                activeTab === tab.id 
                  ? "text-noir-accent scale-110" 
                  : "text-noir-text-muted hover:text-zinc-300 scale-100"
              }`}
            >
              <div className={`transition-all duration-300 ${activeTab === tab.id ? "drop-shadow-[0_0_6px_rgba(204,255,0,0.6)]" : ""}`}>
                {tab.icon}
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-wider transition-all duration-300 ${activeTab === tab.id ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>{tab.label}</span>
            </button>
          ))}
          </div>
        </div>
      </nav>
    </main>
  );
}
