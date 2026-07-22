"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Users, Dumbbell, ShieldAlert, ChevronLeft, Trash2, Mail, Activity, Flame, Medal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [activeTab, setActiveTab] = useState<"directory" | "activity">("directory");
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);

      // Fetch admin stats
      const { data: allProfiles, error } = await supabase.rpc("admin_get_users");
      if (error) {
        console.error("Admin fetch error:", error);
        // Fallback if RPC isn't set up yet
        const { data: fallbackProfiles } = await supabase.from("profiles").select("*");
        if (fallbackProfiles) setProfiles(fallbackProfiles);
      } else if (allProfiles) {
        setProfiles(allProfiles);
      }

      const { count } = await supabase.from("workout_logs").select("*", { count: 'exact', head: true });
      setTotalLogs(count || 0);

      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleDeleteUser = async (targetId: string, username: string) => {
    if (!window.confirm(`⚠️ WARNING ⚠️\n\nAre you sure you want to completely eradicate ${username || 'this user'}? This will destroy all their logs, programs, and history permanently. This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.rpc("admin_delete_user", { target_user_id: targetId });
    if (error) {
      alert("Failed to delete user. Make sure the SQL RPC is set up in Supabase.");
      console.error(error);
    } else {
      setProfiles(prev => prev.filter(p => p.id !== targetId));
      alert(`${username || 'User'} has been terminated.`);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-noir-bg text-noir-text-muted">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-bold tracking-widest uppercase text-xs">Loading Secure Panel...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const activeUsers = profiles.filter(p => (p.workout_count || 0) > 0).length;
  const topActiveUsers = [...profiles].sort((a, b) => (b.workout_count || 0) - (a.workout_count || 0)).slice(0, 10);

  return (
    <div className="min-h-screen bg-noir-bg p-6 md:p-12 font-sans relative overflow-hidden">
      
      {/* Aesthetic Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
        
        <header className="flex items-center gap-4 pb-6">
          <Link href="/" className="p-3 rounded-xl bg-noir-surface/50 border border-noir-border/50 hover:bg-noir-surface hover:text-noir-accent transition-all backdrop-blur-md">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 flex items-center gap-3">
              Admin Core
            </h1>
            <p className="text-sm text-noir-text-muted font-bold tracking-widest uppercase mt-1">Global System Oversight</p>
          </div>
        </header>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-noir-surface/40 backdrop-blur-md border border-noir-border/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users size={80} />
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-noir-text-muted mb-2 flex items-center gap-2">
              <Users size={14} className="text-blue-400" /> Total Accounts
            </p>
            <p className="text-5xl font-black text-white">{profiles.length}</p>
          </div>
          
          <div className="bg-noir-surface/40 backdrop-blur-md border border-noir-border/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={80} />
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-noir-text-muted mb-2 flex items-center gap-2">
              <Flame size={14} className="text-amber-400" /> Active Users
            </p>
            <p className="text-5xl font-black text-white">{activeUsers}</p>
            <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold mt-2 opacity-70">
              {((activeUsers / Math.max(1, profiles.length)) * 100).toFixed(1)}% Conversion
            </p>
          </div>

          <div className="bg-noir-surface/40 backdrop-blur-md border border-noir-border/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Dumbbell size={80} />
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-noir-text-muted mb-2 flex items-center gap-2">
              <Dumbbell size={14} className="text-emerald-400" /> Total Logs
            </p>
            <p className="text-5xl font-black text-white">{totalLogs}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-noir-border/50 pb-px">
          <button 
            onClick={() => setActiveTab("directory")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all rounded-t-lg ${activeTab === "directory" ? "bg-noir-surface/80 text-white border-t border-l border-r border-noir-border/50" : "text-noir-text-muted hover:text-white"}`}
          >
            User Directory
          </button>
          <button 
            onClick={() => setActiveTab("activity")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all rounded-t-lg ${activeTab === "activity" ? "bg-noir-surface/80 text-white border-t border-l border-r border-noir-border/50" : "text-noir-text-muted hover:text-white"}`}
          >
            Top Activity
          </button>
        </div>

        {activeTab === "directory" && (
          <div className="bg-noir-surface/40 backdrop-blur-xl border border-noir-border/50 rounded-b-2xl rounded-tr-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-black/40 text-noir-text-muted text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="p-5">User</th>
                    <th className="p-5">Contact</th>
                    <th className="p-5 text-center">Status</th>
                    <th className="p-5 text-center">Activity</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-noir-border/50">
                  {profiles.map(p => (
                    <tr key={p.id} className="hover:bg-noir-surface/80 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border border-noir-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center font-bold text-noir-text-muted">
                              {p.username?.substring(0,2).toUpperCase() || "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-base">{p.username || "Unnamed"}</p>
                            <p className="text-[10px] text-noir-text-muted font-mono">{p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        {p.email ? (
                          <span className="flex items-center gap-2 text-zinc-300 bg-zinc-900/50 px-3 py-1.5 rounded-lg w-fit border border-zinc-800">
                            <Mail size={14} className="text-zinc-500" /> {p.email}
                          </span>
                        ) : (
                          <span className="opacity-30 italic text-xs">No Access (Run RPC)</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {p.is_admin ? (
                          <span className="bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">Admin</span>
                        ) : (
                          <span className="bg-noir-bg text-noir-text-muted border border-noir-border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">User</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-lg">{p.workout_count || 0}</span>
                          <span className="text-[9px] uppercase tracking-widest font-bold text-noir-text-muted">Logs</span>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        {!p.is_admin && (
                          <button 
                            onClick={() => handleDeleteUser(p.id, p.username)}
                            className="p-2.5 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-transparent hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            title="Terminate User"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="bg-noir-surface/40 backdrop-blur-xl border border-noir-border/50 rounded-b-2xl rounded-tr-2xl overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Medal className="text-amber-400" /> Top 10 Most Active Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topActiveUsers.map((p, idx) => (
                <div key={p.id} className="bg-noir-bg/50 border border-noir-border/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-noir-surface flex items-center justify-center font-black text-noir-text-muted border border-noir-border/50">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg leading-tight">{p.username}</p>
                      <p className="text-[10px] text-noir-text-muted uppercase tracking-widest font-bold">Joined {new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-noir-accent">{p.workout_count || 0}</p>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-noir-text-muted">Workouts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
