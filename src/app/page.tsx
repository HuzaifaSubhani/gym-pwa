"use client";

import { useState, useEffect } from "react";
import WorkoutLogger from "@/components/WorkoutLogger";
import ProgressAnalytics from "@/components/ProgressAnalytics";
import Dashboard from "@/components/Dashboard";
import Leaderboard from "@/components/Leaderboard";
import Profile from "@/components/Profile";
import { Dumbbell, LayoutDashboard, Trophy, User, Loader2 } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { getCurrentProtocolDateInfo } from "@/data/protocol";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "workout" | "leaderboard" | "profile">("dashboard");
  const { state, setActiveWeekDay, syncWithUser } = useProtocol();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        // Now that they are logged in, initialize their specific local store
        syncWithUser(session.user.id);
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, [router, syncWithUser]);

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
    <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-noir-bg">
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 md:px-8 max-w-3xl mx-auto w-full">
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Dashboard />
            <ProgressAnalytics />
          </div>
        )}
        {activeTab === "workout" && <WorkoutLogger />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "profile" && <Profile />}
      </div>

      {/* Bottom Navigation for mobile-first usage */}
      <nav className="fixed bottom-0 left-0 right-0 bg-noir-surface border-t border-noir-border pb-safe">
        <div className="flex">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "dashboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Hub</span>
          </button>
          
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "workout" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Dumbbell size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Log</span>
          </button>
          
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "leaderboard" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <Trophy size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Squad</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
              activeTab === "profile" ? "text-noir-accent" : "text-noir-text-muted"
            }`}
          >
            <User size={24} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Profile</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
