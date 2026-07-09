"use client";

import { useState, useEffect } from "react";
import WorkoutLogger from "@/components/WorkoutLogger";
import ProgressAnalytics from "@/components/ProgressAnalytics";
import Dashboard from "@/components/Dashboard";
import Leaderboard from "@/components/Leaderboard";
import Profile from "@/components/Profile";
import { Home as HomeIcon, Dumbbell, Trophy, User, Loader2 } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { getCurrentProtocolDateInfo } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "workout" | "leaderboard" | "profile">("dashboard");
  const { state, setActiveWeekDay, syncWithUser } = useProtocol();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [username, setUsername] = useState("Athlete");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        // Fetch from profile to ensure we get it even if user_metadata is stale
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        if (profile?.username) {
          setUsername(profile.username);
        } else if (session.user.user_metadata?.username) {
          setUsername(session.user.user_metadata.username);
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
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#A78BFA]/10 rounded-full pointer-events-none fixed animate-glow-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A78BFA]/5 rounded-full pointer-events-none fixed animate-glow-pulse" style={{ animationDelay: '3s' }}></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none fixed"></div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 md:px-8 max-w-3xl mx-auto w-full relative z-10">
        


        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <Dashboard />
            <ProgressAnalytics />
          </div>
        )}
        {activeTab === "workout" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><WorkoutLogger /></div>}
        {activeTab === "leaderboard" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><Leaderboard /></div>}
        {activeTab === "profile" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"><Profile /></div>}
      </div>

      {/* Bottom Navigation for mobile-first usage */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto bg-noir-surface border-t border-noir-border pb-safe pointer-events-auto">
          <div className="flex">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "dashboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <HomeIcon size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "workout" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Dumbbell size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Train</span>
          </button>
          
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "leaderboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Trophy size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Ranks</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "profile" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <User size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">You</span>
          </button>
        </div>
        </div>
      </nav>
    </main>
  );
}
