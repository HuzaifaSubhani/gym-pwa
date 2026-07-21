"use client";

import { useState, useMemo } from "react";
import { X, Calculator } from "lucide-react";

export default function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight,
  onApplyWeight
}: {
  isOpen: boolean;
  onClose: () => void;
  initialWeight: string;
  onApplyWeight: (weight: string) => void;
}) {
  const [targetWeight, setTargetWeight] = useState(initialWeight || "");
  const [barWeight, setBarWeight] = useState(20);
  const [mode, setMode] = useState<"forward" | "reverse">("forward");

  // Reverse mode state (how many of each plate on ONE side)
  const [loadedPlates, setLoadedPlates] = useState<Record<number, number>>({
    25: 0, 20: 0, 15: 0, 10: 0, 5: 0, 2.5: 0, 1.25: 0
  });

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];

  // Forward mode calculation
  const calculatedPlates = useMemo(() => {
    if (mode !== "forward") return [];
    let w = parseFloat(targetWeight);
    if (isNaN(w) || w <= barWeight) return [];
    
    let remainingWeight = (w - barWeight) / 2;
    const platesNeeded: number[] = [];
    
    for (const plate of availablePlates) {
      while (remainingWeight >= plate) {
        platesNeeded.push(plate);
        remainingWeight -= plate;
        // Float precision fix
        remainingWeight = Math.round(remainingWeight * 100) / 100;
      }
    }
    return platesNeeded;
  }, [targetWeight, barWeight, mode]);

  // Reverse mode calculation
  const reverseTotal = useMemo(() => {
    let total = barWeight;
    Object.entries(loadedPlates).forEach(([plateStr, count]) => {
      total += parseFloat(plateStr) * count * 2;
    });
    return total;
  }, [barWeight, loadedPlates]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (mode === "forward") {
      onApplyWeight(targetWeight);
    } else {
      onApplyWeight(reverseTotal.toString());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-noir-bg border border-noir-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90dvh] shadow-2xl relative">
        <div className="p-4 border-b border-noir-border flex justify-between items-center bg-noir-surface sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Calculator className="text-noir-accent" size={20} />
            <h2 className="font-black text-lg uppercase tracking-wider">Plate Calculator</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-noir-surface-light rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {/* Mode Toggle */}
          <div className="flex bg-noir-surface p-1 rounded-xl mb-6">
            <button 
              onClick={() => setMode("forward")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${mode === "forward" ? 'bg-noir-accent text-black' : 'text-noir-text-muted hover:text-white'}`}
            >
              Target Weight
            </button>
            <button 
              onClick={() => setMode("reverse")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${mode === "reverse" ? 'bg-noir-accent text-black' : 'text-noir-text-muted hover:text-white'}`}
            >
              Load Plates
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase font-bold text-noir-text-muted mb-2 tracking-widest">Bar Weight (kg/lbs)</label>
            <div className="flex gap-2">
              {[20, 15, 10].map(w => (
                <button
                  key={w}
                  onClick={() => setBarWeight(w)}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${barWeight === w ? 'border-noir-accent bg-noir-accent/10 text-noir-accent' : 'border-noir-border bg-noir-surface text-noir-text-muted hover:border-noir-text'}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {mode === "forward" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase font-bold text-noir-text-muted mb-2 tracking-widest">Target Weight</label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={e => setTargetWeight(e.target.value)}
                  className="w-full bg-noir-surface border border-noir-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-noir-accent transition-colors text-lg"
                  placeholder="e.g. 100"
                />
              </div>

              {calculatedPlates.length > 0 ? (
                <div>
                  <div className="text-xs uppercase font-bold text-noir-text-muted mb-3 tracking-widest">Plates Per Side</div>
                  <div className="flex flex-wrap gap-2 justify-center py-4 px-2 bg-noir-surface rounded-xl border border-noir-border min-h-[100px] items-center">
                    <div className="w-4 h-24 bg-gray-600 rounded-sm mr-2 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-[2px] bg-gray-400"></div>
                    </div>
                    {calculatedPlates.map((plate, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-center font-black rounded-sm border-2 border-black/20 ${
                          plate >= 20 ? 'h-24 w-6 bg-red-500' :
                          plate >= 15 ? 'h-20 w-5 bg-yellow-500' :
                          plate >= 10 ? 'h-16 w-5 bg-green-500' :
                          plate >= 5 ? 'h-12 w-4 bg-white text-black' :
                          'h-8 w-3 bg-gray-400 text-black text-[8px]'
                        }`}
                        title={`${plate}`}
                      >
                        <span className="rotate-90">{plate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-noir-text-muted text-sm font-bold uppercase tracking-wider">
                  Enter a weight greater than the bar
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-xs uppercase font-bold text-noir-text-muted mb-1 tracking-widest">Total Weight</div>
                <div className="text-4xl font-black text-noir-accent">{reverseTotal}</div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-noir-text-muted mb-2 tracking-widest">Plates Added (Per Side)</label>
                <div className="grid grid-cols-4 gap-2">
                  {availablePlates.map(plate => (
                    <button
                      key={plate}
                      onClick={() => setLoadedPlates(p => ({ ...p, [plate]: (p[plate] || 0) + 1 }))}
                      className="bg-noir-surface border border-noir-border py-3 rounded-xl font-bold hover:bg-noir-surface-light transition-colors relative"
                    >
                      {plate}
                      {loadedPlates[plate] > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-noir-accent text-black rounded-full text-[10px] flex items-center justify-center font-black">
                          {loadedPlates[plate]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => setLoadedPlates({25:0,20:0,15:0,10:0,5:0,2.5:0,1.25:0})}
                    className="text-xs text-red-400 font-bold uppercase tracking-wider hover:text-red-300"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-noir-border bg-noir-surface">
          <button 
            onClick={handleApply}
            className="w-full bg-noir-accent text-black font-black uppercase tracking-wider py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98]"
          >
            Apply Weight
          </button>
        </div>
      </div>
    </div>
  );
}
