"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Users, Dumbbell, ShieldAlert, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
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
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      if (allProfiles) setProfiles(allProfiles);

      const { count } = await supabase.from("workout_logs").select("*", { count: 'exact', head: true });
      setTotalLogs(count || 0);

      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-noir-bg text-noir-text-muted">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-bold tracking-widest uppercase text-xs">Loading Secure Panel...</p>
      </div>
    );
  }

  if (!isAdmin) return null; // Should redirect anyway

  return (
    <div className="min-h-screen bg-noir-bg p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <header className="flex items-center gap-4 border-b border-noir-border pb-6">
          <Link href="/" className="p-2 rounded-lg bg-noir-surface border border-noir-border hover:text-noir-accent transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-red-500 flex items-center gap-3">
              <ShieldAlert size={28} /> Admin Core
            </h1>
            <p className="text-sm text-noir-text-muted">Centralized Control System</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-noir-surface border border-noir-border rounded-xl p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-noir-text-muted">Total Users</p>
              <p className="text-4xl font-black">{profiles.length}</p>
            </div>
          </div>
          
          <div className="bg-noir-surface border border-noir-border rounded-xl p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-noir-accent/10 text-noir-accent flex items-center justify-center">
              <Dumbbell size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-noir-text-muted">Workouts Logged</p>
              <p className="text-4xl font-black">{totalLogs}</p>
            </div>
          </div>
        </div>

        <div className="bg-noir-surface border border-noir-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-noir-border bg-noir-surface-light">
            <h2 className="font-bold uppercase tracking-wider text-sm">User Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-noir-text-muted">
                <tr>
                  <th className="p-4 font-bold">User ID</th>
                  <th className="p-4 font-bold">Username</th>
                  <th className="p-4 font-bold">Admin</th>
                  <th className="p-4 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-noir-border">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-noir-surface-light transition-colors">
                    <td className="p-4 font-mono text-xs opacity-50">{p.id.split('-')[0]}...</td>
                    <td className="p-4 font-bold">{p.username || "Unnamed"}</td>
                    <td className="p-4">
                      {p.is_admin ? <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-bold uppercase">Admin</span> : <span className="opacity-50 text-xs">User</span>}
                    </td>
                    <td className="p-4 text-xs opacity-70">
                      {new Date(p.created_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
