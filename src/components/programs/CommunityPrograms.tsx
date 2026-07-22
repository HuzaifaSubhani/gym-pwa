"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Program } from "@/data/protocol";
import { useProtocol } from "@/hooks/useProtocolStore";
import { Download, Loader2, User, Globe, Search, Plus, Activity, BookOpen, Play, Check } from "lucide-react";
import ProgramBuilder from "@/components/programs/ProgramBuilder";
import SocialFeed from "@/components/social/SocialFeed";

export default function CommunityPrograms() {
  const [subTab, setSubTab] = useState<"feed" | "programs">("feed");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [programs, setPrograms] = useState<(Program & { profiles: { username: string, avatar_url: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { state, saveProgram, setActiveProgram } = useProtocol();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    const fetchUserAndPrograms = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .order('downloads', { ascending: false });

      if (data) {
        setPrograms(data as any);
      }
      setLoading(false);
    };
    fetchUserAndPrograms();
  }, []);

  const handleDownload = async (program: Program) => {
    setDownloadingId(program.id);
    
    // Increment download count
    await supabase.rpc('increment_downloads', { program_id: program.id }).catch(() => {
      // Graceful fail if RPC not created yet
    });

    const localProgram: Program = {
      ...program,
      is_community: true
    };
    
    saveProgram(localProgram);
    setActiveProgram(localProgram.id);
    
    setTimeout(() => {
      setDownloadingId(null);
      alert("Program Downloaded and set as Active!");
    }, 500);
  };

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePublishCurrent = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("You must be logged in to publish programs.");
      return;
    }

    const activeProgram = state.programs?.[state.activeProgramId];
    if (!activeProgram) {
      alert("No active program to publish.");
      return;
    }

    const { error } = await supabase.from('programs').insert({
      creator_id: session.user.id,
      name: `${activeProgram.name} (Community Remix)`,
      description: activeProgram.description || "A custom program shared by the community.",
      duration_weeks: activeProgram.duration_weeks,
      routine_schema: activeProgram.routine_schema
    });

    if (error) {
      console.error(error);
      alert("Failed to publish program. Did you run the SQL script?");
    } else {
      alert("Your current program was published to the community!");
      // Optionally refresh the list here
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="mb-4 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Community Hub</h2>
        <h1 className="text-3xl font-black flex items-center gap-3 mb-6">
          Explore <Globe className="text-noir-accent" size={28} />
        </h1>

        <div className="flex bg-noir-surface border border-noir-border rounded-lg p-1">
          <button 
            onClick={() => setSubTab("feed")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${subTab === 'feed' ? 'bg-noir-bg text-white shadow-sm' : 'text-noir-text-muted hover:text-white'}`}
          >
            <Activity size={16} /> Feed
          </button>
          <button 
            onClick={() => setSubTab("programs")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${subTab === 'programs' ? 'bg-noir-bg text-white shadow-sm' : 'text-noir-text-muted hover:text-white'}`}
          >
            <Download size={16} /> Programs
          </button>
        </div>
      </header>

      {subTab === "feed" ? (
        <SocialFeed currentUser={currentUser} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-2 px-2">
            <button 
              onClick={handlePublishCurrent}
              className="bg-noir-bg text-white border border-noir-border font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:bg-noir-surface flex items-center gap-1 shadow-lg transition-colors"
            >
              Publish Mine
            </button>
            <button 
              onClick={() => setShowBuilder(true)}
              className="bg-noir-accent text-black font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1 shadow-lg transition-colors"
            >
              <Plus size={14} /> Create
            </button>
          </div>

          {/* My Library Section */}
          <div className="space-y-3 px-2">
            <h3 className="text-sm font-black text-noir-accent uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={16} /> My Library
            </h3>
            <div className="grid gap-3">
              {Object.values(state.programs || {}).map((prog: any) => {
                const isActive = state.activeProgramId === prog.id;
                return (
                  <div key={prog.id} className={`bg-noir-surface border rounded-xl p-4 flex justify-between items-center transition-all ${isActive ? 'border-noir-accent/50 shadow-[0_0_15px_rgba(204,255,0,0.05)]' : 'border-noir-border'}`}>
                    <div className="min-w-0 pr-4">
                      <h4 className="font-bold text-sm text-white truncate">{prog.name}</h4>
                      <p className="text-[10px] text-noir-text-muted uppercase tracking-wider font-semibold">
                        {prog.duration_weeks} Weeks {prog.id === 'ironcore' ? '• Default' : ''}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-noir-accent bg-noir-accent/10 px-3 py-1.5 rounded-lg border border-noir-accent/30 uppercase">
                        <Check size={12} /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveProgram(prog.id);
                          alert(`${prog.name} is now active!`);
                        }}
                        className="flex items-center gap-1 text-[10px] font-black tracking-widest text-black bg-noir-accent hover:opacity-90 px-3 py-1.5 rounded-lg transition-opacity uppercase"
                      >
                        <Play size={10} className="fill-current" /> Activate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-noir-border/30 my-6 mx-2"></div>

          <div className="relative px-2">
            <Search className="absolute left-6 top-4 text-noir-text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Search community programs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-noir-surface border border-noir-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-noir-accent shadow-lg"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-noir-accent" size={32} />
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border">
              <p className="text-noir-text-muted">No programs found.</p>
            </div>
          ) : (
            <div className="grid gap-4 px-2">
              {filteredPrograms.map(program => (
                <div key={program.id} className="bg-noir-surface border border-noir-border rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-noir-accent/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-noir-accent/10 transition-colors"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="text-lg font-black text-white">{program.name}</h3>
                      <p className="text-xs text-noir-accent uppercase tracking-widest font-bold">{program.duration_weeks} Weeks Split</p>
                    </div>
                    <div className="flex items-center gap-2 bg-noir-bg px-2 py-1 rounded-lg border border-noir-border/50">
                      <Download size={12} className="text-noir-text-muted" />
                      <span className="text-xs font-bold text-white">{program.downloads || 0}</span>
                    </div>
                  </div>

                  <p className="text-sm text-noir-text-muted mb-6 relative z-10 line-clamp-2">
                    {program.description || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between mt-auto relative z-10">
                    <div className="flex items-center gap-2">
                      {program.profiles?.avatar_url ? (
                        <Image src={program.profiles.avatar_url} alt="author" width={24} height={24} className="w-6 h-6 rounded-full border border-noir-border object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center">
                          <User size={12} />
                        </div>
                      )}
                      <span className="text-xs font-bold text-noir-text-muted">
                        {program.profiles?.username || "Unknown Athlete"}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDownload(program)}
                      disabled={downloadingId === program.id}
                      className="bg-noir-accent text-black font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1"
                    >
                      {downloadingId === program.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBuilder && <ProgramBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  );
}
