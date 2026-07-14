"use client";

import { useState, useEffect } from "react";
import WorkoutLogger from "@/components/WorkoutLogger";
import ProgressAnalytics from "@/components/ProgressAnalytics";
import Dashboard from "@/components/Dashboard";
import Leaderboard from "@/components/Leaderboard";
import Profile from "@/components/Profile";
import WorkoutHistory from "@/components/WorkoutHistory";
import CommunityPrograms from "@/components/CommunityPrograms";
import { Home as HomeIcon, Dumbbell, Trophy, User, CalendarDays, Loader2, Globe } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { getCurrentProtocolDateInfo } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "workout" | "leaderboard" | "history" | "explore" | "profile">("dashboard");
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
      {/* Global Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#CCFF00]/10 rounded-full pointer-events-none fixed animate-glow-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#CCFF00]/5 rounded-full pointer-events-none fixed animate-glow-pulse" style={{ animationDelay: '3s' }}></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none fixed"></div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 md:px-8 max-w-3xl mx-auto w-full relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        


        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <Dashboard avatarUrl={avatarUrl} username={username} />
            <ProgressAnalytics />
          </div>
        )}
        {activeTab === "workout" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><WorkoutLogger /></div>}
        {activeTab === "leaderboard" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><Leaderboard /></div>}
        {activeTab === "history" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><WorkoutHistory /></div>}
        {activeTab === "explore" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><CommunityPrograms /></div>}
        {activeTab === "profile" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><Profile /></div>}
      </div>

      {/* Bottom Navigation for mobile-first usage */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto bg-noir-surface/80 backdrop-blur-xl border-t border-noir-border pb-safe pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "dashboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <HomeIcon size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "workout" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Dumbbell size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">Train</span>
          </button>
          
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "leaderboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Trophy size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">Ranks</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "history" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <CalendarDays size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">History</span>
          </button>

          <button
            onClick={() => setActiveTab("explore")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "explore" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Globe size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">Explore</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "profile" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="You" className={`w-6 h-6 rounded-full border border-noir-border object-cover ${activeTab === "profile" ? "border-noir-accent shadow-[0_0_10px_rgba(204,255,0,0.5)]" : ""}`} />
            ) : (
              <User size={24} />
            )}
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">You</span>
          </button>
        </div>
        </div>
      </nav>
    </main>
  );
}
