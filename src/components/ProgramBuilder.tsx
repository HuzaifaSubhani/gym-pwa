"use client";

import { useState } from "react";
import { useProtocol } from "@/hooks/useProtocolStore";
import { Program, DayRoutine } from "@/data/protocol";
import exercisesData from "@/data/exercises.json";
import { Plus, Trash2, Save, X, Search, Check, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ProgramBuilder({ onClose }: { onClose: () => void }) {
  const { saveProgram, setActiveProgram } = useProtocol();
  const [name, setName] = useState("My Custom Protocol");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(4);
  const [routine, setRoutine] = useState<Record<number, DayRoutine>>({});
  
  const [activeDayEdit, setActiveDayEdit] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const filteredExercises = exercisesData.filter((ex: any) => 
    (ex.name && ex.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (ex.t && ex.t.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (ex.b && ex.b.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 50);

  const handleAddDay = (dayNum: number) => {
    setRoutine(prev => ({
      ...prev,
      [dayNum]: { dayName: `Day ${dayNum}`, focus: "Full Body", exercises: [] }
    }));
    setActiveDayEdit(dayNum);
  };

  const handleRemoveDay = (dayNum: number) => {
    setRoutine(prev => {
      const next = { ...prev };
      delete next[dayNum];
      return next;
    });
    if (activeDayEdit === dayNum) setActiveDayEdit(null);
  };

  const handleAddExercise = (dayNum: number, exercise: any) => {
    setRoutine(prev => {
      const day = prev[dayNum];
      if (!day) return prev;
      return {
        ...prev,
        [dayNum]: {
          ...day,
          exercises: [...day.exercises, {
            id: exercise.id,
            name: exercise.name,
            sets: 3,
            reps: "8-12",
            rest: 60,
            gif_url: exercise.g
          }]
        }
      };
    });
  };

  const handleRemoveExercise = (dayNum: number, index: number) => {
    setRoutine(prev => {
      const day = prev[dayNum];
      if (!day) return prev;
      const nextEx = [...day.exercises];
      nextEx.splice(index, 1);
      return {
        ...prev,
        [dayNum]: { ...day, exercises: nextEx }
      };
    });
  };

  const handleSaveLocal = () => {
    const id = `custom-${Date.now()}`;
    const newProgram: Program = {
      id,
      name,
      description,
      duration_weeks: duration,
      routine_schema: routine,
      is_community: false
    };
    saveProgram(newProgram);
    setActiveProgram(id);
    onClose();
  };

  const handlePublish = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("You must be logged in to publish programs.");
      return;
    }

    setIsPublishing(true);
    const newProgram: Program = {
      id: `custom-${Date.now()}`,
      name,
      description,
      duration_weeks: duration,
      routine_schema: routine,
      is_community: true,
      creator_id: session.user.id
    };

    const { error } = await supabase.from('programs').insert({
      creator_id: session.user.id,
      name: newProgram.name,
      description: newProgram.description,
      duration_weeks: newProgram.duration_weeks,
      routine_schema: newProgram.routine_schema
    });

    setIsPublishing(false);

    if (error) {
      console.error(error);
      alert("Failed to publish program.");
    } else {
      saveProgram(newProgram);
      setActiveProgram(newProgram.id);
      alert("Program published to the community!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-noir-bg overflow-y-auto">
      <div className="max-w-3xl mx-auto min-h-screen p-4 sm:p-6 pb-48">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black">Program Forge</h1>
          <button onClick={onClose} className="p-2 bg-noir-surface rounded-full text-noir-text hover:text-red-500">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6">
          <section className="bg-noir-surface p-6 rounded-2xl border border-noir-border shadow-lg space-y-4">
            <div>
              <label className="block text-xs font-bold text-noir-text-muted uppercase tracking-widest mb-1">Program Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-white focus:outline-none focus:border-noir-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-noir-text-muted uppercase tracking-widest mb-1">Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-white focus:outline-none focus:border-noir-accent min-h-[80px]"
                placeholder="What is the goal of this program?"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-noir-text-muted uppercase tracking-widest mb-1">Duration (Weeks)</label>
              <input 
                type="number" 
                min={1} max={52}
                value={duration} 
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-white focus:outline-none focus:border-noir-accent"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-noir-border pb-2">Weekly Split</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1,2,3,4,5,6,7].map(dayNum => {
                const hasDay = !!routine[dayNum];
                return (
                  <button 
                    key={dayNum}
                    onClick={() => hasDay ? setActiveDayEdit(dayNum) : handleAddDay(dayNum)}
                    className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${
                      hasDay 
                        ? activeDayEdit === dayNum 
                          ? "border-noir-accent bg-noir-accent/20 text-noir-accent" 
                          : "border-noir-border bg-noir-surface text-white"
                        : "border-dashed border-noir-border bg-transparent text-noir-text-muted hover:border-noir-accent/50 hover:text-noir-accent/50"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest mb-1">Day {dayNum}</span>
                    {hasDay ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                );
              })}
            </div>

            {activeDayEdit !== null && routine[activeDayEdit] && (
              <div className="bg-noir-surface p-4 sm:p-6 rounded-2xl border border-noir-border shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                  <input 
                    type="text" 
                    value={routine[activeDayEdit].focus}
                    onChange={(e) => setRoutine(prev => ({...prev, [activeDayEdit]: {...prev[activeDayEdit], focus: e.target.value}}))}
                    className="bg-transparent text-lg font-bold focus:outline-none border-b border-dashed border-noir-border focus:border-noir-accent pb-1 w-full max-w-[200px]"
                    placeholder="Day Focus (e.g. Push)"
                  />
                  <button onClick={() => handleRemoveDay(activeDayEdit)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {routine[activeDayEdit].exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-noir-bg p-3 rounded-lg border border-noir-border">
                      <div>
                        <p className="font-bold text-sm text-noir-accent">{ex.name}</p>
                        <p className="text-xs text-noir-text-muted">{ex.sets} sets x {ex.reps}</p>
                      </div>
                      <button onClick={() => handleRemoveExercise(activeDayEdit, idx)} className="text-noir-text-muted hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {routine[activeDayEdit].exercises.length === 0 && (
                    <p className="text-sm text-noir-text-muted text-center py-4 border border-dashed border-noir-border rounded-lg">No exercises added yet.</p>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 text-noir-text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search exercises to add..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-noir-bg border border-noir-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-noir-accent mb-2"
                  />
                  {searchQuery && (
                    <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-noir-bg border border-noir-border rounded-lg mb-1 z-10 shadow-2xl custom-scrollbar">
                      {filteredExercises.map(ex => (
                        <button 
                          key={ex.id}
                          onClick={() => { handleAddExercise(activeDayEdit, ex); setSearchQuery(""); }}
                          className="w-full text-left p-3 hover:bg-noir-surface-light border-b border-noir-border/50 last:border-0 flex justify-between items-center"
                        >
                          <span className="text-sm font-bold">{ex.name}</span>
                          <span className="text-xs text-noir-text-muted uppercase tracking-widest">{(ex as any).t}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 bg-noir-surface border-t border-noir-border p-4 flex gap-4 max-w-3xl mx-auto">
        <button 
          onClick={handleSaveLocal}
          className="flex-1 bg-noir-bg border border-noir-accent text-noir-accent font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-noir-accent/10"
        >
          <Save size={18} /> Save Private
        </button>
        <button 
          onClick={handlePublish}
          disabled={isPublishing}
          className="flex-1 bg-noir-accent text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {isPublishing ? <Loader2 className="animate-spin" size={18} /> : <Globe size={18} />} Publish Global
        </button>
      </div>
    </div>
  );
}
