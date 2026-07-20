"use client";

import { useState, useEffect } from "react";
import { Check, ChevronRight, ArrowRight, X, Search, Dumbbell } from "lucide-react";
import { Exercise, SetType } from "@/data/protocol";
import { GiMuscularTorso, GiBiceps, GiArm, GiLeg, GiHeartBeats, GiShoulderArmor, GiAbdominalArmor, GiSpineArrow } from "react-icons/gi";

const CATEGORIES = [
  { id: "chest", name: "Chest", parts: ["pectorals", "serratus anterior"], IconFallback: GiMuscularTorso },
  { id: "back", name: "Back", parts: ["lats", "upper back", "traps", "levator scapulae"], iconUrl: "/back.png", IconFallback: GiSpineArrow },
  { id: "shoulders", name: "Shoulders", parts: ["delts"], iconUrl: "/Shoulder.png", IconFallback: GiShoulderArmor },
  { id: "biceps", name: "Biceps", parts: ["biceps"], iconUrl: "/bicep.png", IconFallback: GiBiceps },
  { id: "triceps", name: "Triceps", parts: ["triceps"], iconUrl: "/Tricep.png", IconFallback: GiArm },
  { id: "legs", name: "Legs", parts: ["quads", "glutes", "hamstrings", "calves", "adductors", "abductors"], iconUrl: "/legs.png", IconFallback: GiLeg },
  { id: "core", name: "Core", parts: ["abs", "spine"], iconUrl: "/core.png", IconFallback: GiAbdominalArmor },
  { id: "cardio", name: "Cardio", parts: ["cardiovascular system"], IconFallback: GiHeartBeats },
];

type ExerciseDBEntry = {
  id: string;
  name: string;
  t: string; // target muscle
  b: string; // body part
  g?: string; // gif url
};

export default function AddExerciseModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ex: Exercise, scope: "today" | "every_week") => void;
}) {
  const [view, setView] = useState<"categories" | "list" | "setup">("categories");
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDBEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Setup state
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-10");
  const [rest, setRest] = useState("60");
  const [scope, setScope] = useState<"today" | "every_week">("today");
  const [setType, setSetType] = useState<SetType>("normal");
  const [dropCount, setDropCount] = useState(2);
  
  const [dbExercises, setDbExercises] = useState<ExerciseDBEntry[]>([]);

  useEffect(() => {
    if (isOpen && dbExercises.length === 0) {
      fetch('/data/exercises.json')
        .then(res => res.json())
        .then(data => setDbExercises(data))
        .catch(err => console.error("Failed to load exercise db:", err));
    }
    if (isOpen) {
      // Reset state on open
      setView("categories");
      setSearchTerm("");
      setSelectedCategory(null);
      setSelectedExercise(null);
      setSetType("normal");
      setDropCount(2);
    }
  }, [isOpen, dbExercises.length]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!selectedExercise) return;
    const exercise: Exercise = {
      id: `custom_${Date.now()}`,
      name: selectedExercise.name,
      sets: parseInt(sets, 10) || 3,
      reps,
      rest: parseInt(rest, 10) || 60,
      gif_url: selectedExercise.g,
      setType: setType,
      dropConfig: setType === 'drop' ? { drops: dropCount } : undefined,
    };
    onAdd(exercise, scope);
    onClose();
  };

  // Filter exercises based on view
  let displayedExercises: ExerciseDBEntry[] = [];
  if (searchTerm.length >= 2) {
    displayedExercises = dbExercises.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()));
  } else if (selectedCategory) {
    displayedExercises = dbExercises.filter(ex => selectedCategory.parts.includes(ex.t));
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-center md:items-center md:p-4 bg-noir-bg animate-in fade-in">
      <div className="bg-noir-surface border-0 md:border md:border-noir-border md:rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col h-[100dvh] md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-noir-border flex items-center gap-3 relative bg-noir-surface/50">
          {(view === "list" || view === "setup" || searchTerm) && (
            <button 
              onClick={() => {
                if (view === "setup") {
                  setView(searchTerm ? "categories" : "list");
                  if (searchTerm) setSearchTerm("");
                } else {
                  setView("categories");
                  setSearchTerm("");
                  setSelectedCategory(null);
                }
              }}
              className="p-2 rounded-full hover:bg-noir-bg text-noir-text-muted hover:text-noir-accent transition-colors"
            >
              <ArrowRight size={18} className="rotate-180" />
            </button>
          )}
          <h2 className="text-xl font-bold flex-1">
            {view === "setup" ? "Configure Set" : selectedCategory && !searchTerm ? selectedCategory.name : "Add Exercise"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-noir-bg text-noir-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Search Bar */}
          {view !== "setup" && (
            <div className="relative shrink-0">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 pl-10 text-noir-text focus:outline-none focus:border-noir-accent placeholder:text-noir-text-muted/50" 
                placeholder="Search 1,300+ exercises..." 
              />
              <Search className="absolute left-3 top-3.5 text-noir-text-muted" size={18} />
            </div>
          )}

          {/* Categories Grid */}
          {view === "categories" && !searchTerm && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setView("list");
                  }}
                  className="bg-noir-bg border border-noir-border hover:border-noir-accent p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-lg group"
                >
                  <div className="text-noir-text-muted group-hover:text-noir-accent transition-colors duration-300">
                    {cat.iconUrl ? (
                      <img src={cat.iconUrl} alt={cat.name} className="w-12 h-12 object-contain brightness-0 invert opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                    ) : (
                      <cat.IconFallback size={32} strokeWidth={1.5} />
                    )}
                  </div>
                  <span className="font-bold text-sm tracking-wide text-noir-text-muted group-hover:text-white transition-colors">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Exercise List */}
          {(view === "list" || searchTerm.length >= 2) && view !== "setup" && (
            <div className="flex flex-col gap-2 mt-2 pb-10">
              {displayedExercises.slice(0, 50).map(ex => (
                <div 
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setView("setup");
                  }}
                  className="flex items-center gap-4 p-3 bg-noir-bg border border-noir-border rounded-xl cursor-pointer hover:border-noir-accent hover:shadow-lg transition-all group"
                >
                  {ex.g ? (
                    <img 
                      src={ex.g} 
                      alt={ex.name}
                      loading="lazy"
                      className="w-16 h-16 rounded-lg object-cover bg-noir-surface flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-noir-surface border border-noir-border/50 flex items-center justify-center flex-shrink-0 text-noir-text-muted group-hover:text-noir-accent group-hover:border-noir-accent/50 transition-colors">
                      <Dumbbell size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate group-hover:text-noir-accent transition-colors capitalize">{ex.name}</h3>
                    <p className="text-[10px] text-noir-text-muted uppercase tracking-wider mt-1">{ex.b} • {ex.t}</p>
                  </div>
                  <ChevronRight size={16} className="text-noir-text-muted group-hover:text-noir-accent flex-shrink-0" />
                </div>
              ))}
              {displayedExercises.length === 0 && (
                <div className="text-center py-10 text-noir-text-muted">No exercises found.</div>
              )}
            </div>
          )}

          {/* Setup View */}
          {view === "setup" && selectedExercise && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center text-center mb-2">
                {selectedExercise.g ? (
                  <div className="relative w-full h-32 rounded-xl border border-noir-border mb-3 overflow-hidden bg-white shadow-xl flex items-center justify-center p-2">
                    <img src={selectedExercise.g} alt={selectedExercise.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-xl border border-noir-border mb-4 bg-noir-bg flex items-center justify-center shadow-xl text-noir-text-muted">
                    <Dumbbell size={48} className="opacity-20" />
                  </div>
                )}
                <h3 className="text-xl font-black capitalize text-white">{selectedExercise.name}</h3>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Sets</label>
                  <input type="number" value={sets} onChange={e => setSets(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-center font-bold text-lg text-white focus:outline-none focus:border-noir-accent focus:shadow-lg transition-all" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Reps</label>
                  <input type="text" value={reps} onChange={e => setReps(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-center font-bold text-lg text-white focus:outline-none focus:border-noir-accent focus:shadow-lg transition-all" placeholder="8-10" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Rest (s)</label>
                  <input type="number" value={rest} onChange={e => setRest(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-xl p-3 text-center font-bold text-lg text-white focus:outline-none focus:border-noir-accent focus:shadow-lg transition-all" />
                </div>
              </div>

              {/* Set Type Selector */}
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-3 tracking-widest">Set Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'normal' as SetType, label: 'Normal', desc: 'Standard sets', icon: '🏋️' },
                    { value: 'drop' as SetType, label: 'Drop Set', desc: 'Reduce weight each drop', icon: '⬇️' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSetType(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        setType === opt.value
                          ? 'bg-noir-accent/10 border-noir-accent text-noir-accent'
                          : 'border-noir-border text-noir-text-muted hover:border-noir-border/80'
                      }`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Drop count config */}
                {setType === 'drop' && (
                  <div className="mt-3 p-3 rounded-xl bg-noir-bg border border-noir-border animate-in fade-in slide-in-from-top-2">
                    <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 tracking-widest">Drops per Set</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(n => (
                        <button
                          key={n}
                          onClick={() => setDropCount(n)}
                          className={`flex-1 py-2 rounded-lg border text-center font-bold text-sm transition-all ${
                            dropCount === n
                              ? 'bg-noir-accent/10 border-noir-accent text-noir-accent'
                              : 'border-noir-border text-noir-text-muted hover:text-white'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-3 tracking-widest">Frequency</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex flex-col items-center gap-2 cursor-pointer relative">
                    <input type="radio" checked={scope === "today"} onChange={() => setScope("today")} className="peer sr-only" />
                    <div className="w-full p-3 rounded-xl border border-noir-border text-center peer-checked:bg-noir-accent/10 peer-checked:border-noir-accent peer-checked:text-noir-accent transition-all">
                      <span className="text-sm font-bold">Today Only</span>
                    </div>
                  </label>
                  <label className="flex-1 flex flex-col items-center gap-2 cursor-pointer relative">
                    <input type="radio" checked={scope === "every_week"} onChange={() => setScope("every_week")} className="peer sr-only" />
                    <div className="w-full p-3 rounded-xl border border-noir-border text-center peer-checked:bg-noir-accent/10 peer-checked:border-noir-accent peer-checked:text-noir-accent transition-all">
                      <span className="text-sm font-bold">Every Week</span>
                    </div>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleAdd}
                className="w-full bg-noir-accent text-noir-bg font-black py-4 rounded-xl hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2 shadow-lg"
              >
                <Check size={20} /> ADD TO ROUTINE
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
