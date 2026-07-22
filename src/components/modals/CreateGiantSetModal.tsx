"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Trash2, X, Search, Dumbbell } from "lucide-react";
import { Exercise, CompoundGroup } from "@/data/protocol";

type ExerciseDBEntry = {
  id: string;
  name: string;
  t: string;
  b: string;
  g?: string;
};

export default function CreateGiantSetModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (group: CompoundGroup) => void;
}) {
  const [name, setName] = useState("Giant Set");
  const [rounds, setRounds] = useState(3);
  const [rest, setRest] = useState(90);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dbExercises, setDbExercises] = useState<ExerciseDBEntry[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && dbExercises.length === 0) {
      fetch('/data/exercises.json')
        .then(res => res.json())
        .then(data => setDbExercises(data))
        .catch(err => console.error("Failed to load exercise db:", err));
    }
    if (isOpen) {
      setName("Giant Set");
      setRounds(3);
      setRest(90);
      setExercises([]);
      setSearchTerm("");
    }
  }, [isOpen, dbExercises.length]);

  if (!isOpen || !mounted) return null;

  const handleAddExercise = (dbEx: ExerciseDBEntry) => {
    const ex: Exercise = {
      id: `gs_${Date.now()}_${exercises.length}`,
      name: dbEx.name,
      sets: rounds,
      reps: "8-12",
      rest: 0,
      gif_url: dbEx.g,
    };
    setExercises(prev => [...prev, ex]);
    setShowExercisePicker(false);
    setSearchTerm("");
  };

  const handleRemoveExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = () => {
    if (exercises.length < 2) return;
    const group: CompoundGroup = {
      id: `cg_${Date.now()}`,
      type: 'compound_group',
      name,
      exercises: exercises.map(ex => ({ ...ex, sets: rounds })),
      rest,
      rounds,
    };
    onAdd(group);
    onClose();
  };

  const displayedExercises = searchTerm.length >= 2
    ? dbExercises.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 30)
    : [];

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-noir-bg/90 backdrop-blur-sm animate-in fade-in">
      <div className="bg-noir-surface border border-noir-border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-noir-border flex items-center gap-3 shrink-0">
          <h2 className="text-xl font-bold flex-1">🔄 Create Giant Set</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-noir-bg text-noir-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Circuit Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-white focus:outline-none focus:border-purple-400"
              placeholder="e.g. Chest & Tri Combo"
            />
          </div>

          {/* Rounds + Rest */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Rounds</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rounds}
                onChange={e => setRounds(parseInt(e.target.value) || 3)}
                className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-center font-bold text-lg text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Rest (s)</label>
              <input
                type="number"
                value={rest}
                onChange={e => setRest(parseInt(e.target.value) || 60)}
                className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-center font-bold text-lg text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Exercises in circuit */}
          <div>
            <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">
              Exercises ({exercises.length}/5)
            </label>
            <div className="space-y-2 mb-3">
              {exercises.map((ex, idx) => (
                <div key={ex.id} className="flex items-center gap-3 bg-noir-bg border border-noir-border rounded-xl p-3">
                  <span className="text-purple-400 font-black text-sm w-5 text-center">{idx + 1}</span>
                  <span className="flex-1 font-bold text-sm capitalize truncate">{ex.name}</span>
                  <button onClick={() => handleRemoveExercise(idx)} className="text-noir-text-muted hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {exercises.length === 0 && (
                <p className="text-sm text-noir-text-muted text-center py-4 border border-dashed border-noir-border rounded-lg">
                  Add at least 2 exercises to create a giant set
                </p>
              )}
            </div>

            {exercises.length < 5 && (
              <>
                {showExercisePicker ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-noir-text-muted" size={16} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-noir-bg border border-noir-border rounded-xl pl-10 pr-4 p-2.5 text-sm focus:outline-none focus:border-purple-400 placeholder:text-noir-text-muted/50"
                        placeholder="Search exercises..."
                        autoFocus
                      />
                    </div>
                    {displayedExercises.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {displayedExercises.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => handleAddExercise(ex)}
                            className="w-full text-left px-3 py-2 rounded-lg border border-noir-border hover:border-purple-400 hover:bg-purple-400/5 transition-colors flex items-center gap-2"
                          >
                            <span className="text-sm font-bold capitalize flex-1 truncate">{ex.name}</span>
                            <span className="text-[9px] text-purple-400 uppercase tracking-widest">{ex.t}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setShowExercisePicker(false); setSearchTerm(""); }}
                      className="w-full py-2 text-xs font-bold text-noir-text-muted uppercase tracking-widest border border-noir-border rounded-lg hover:bg-noir-surface-light transition-colors text-center"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className="w-full py-3 border-2 border-dashed border-noir-border rounded-xl text-noir-text-muted hover:text-purple-400 hover:border-purple-400 hover:bg-purple-400/5 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <Plus size={16} /> Add Exercise to Circuit
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-noir-border shrink-0">
          <button
            onClick={handleCreate}
            disabled={exercises.length < 2}
            className="w-full bg-purple-500 text-white font-black py-4 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={20} /> CREATE GIANT SET
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
