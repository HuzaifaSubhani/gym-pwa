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
          <div className="flex bg-black/50 p-1.5 rounded-xl mb-6 border border-noir-border shadow-inner">
            <button 
              onClick={() => setMode("forward")}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === "forward" ? 'bg-noir-accent text-black shadow-md' : 'text-noir-text-muted hover:text-white hover:bg-white/5'}`}
            >
              Target Weight
            </button>
            <button 
              onClick={() => setMode("reverse")}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === "reverse" ? 'bg-noir-accent text-black shadow-md' : 'text-noir-text-muted hover:text-white hover:bg-white/5'}`}
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
                <div className="relative">
                  <input
                    type="number"
                    value={targetWeight}
                    onChange={e => setTargetWeight(e.target.value)}
                    className="w-full bg-black/50 border border-noir-border rounded-xl pl-4 pr-12 py-4 font-black focus:outline-none focus:border-noir-accent transition-colors text-3xl shadow-inner text-white"
                    placeholder="e.g. 100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-noir-text-muted font-bold tracking-widest uppercase">KG</span>
                </div>
              </div>

              {calculatedPlates.length > 0 ? (
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="text-xs uppercase font-black text-noir-text-muted tracking-widest">Load Per Side</div>
                    <div className="text-[10px] text-noir-accent font-bold tracking-widest">{((parseFloat(targetWeight) - barWeight) / 2).toFixed(2)} kg</div>
                  </div>
                  <div className="flex justify-center py-8 px-4 bg-gradient-to-b from-noir-surface to-black/50 rounded-2xl border border-noir-border min-h-[140px] items-center shadow-inner overflow-hidden relative">
                    {/* The Barbell Collar */}
                    <div className="w-8 h-16 bg-gradient-to-b from-gray-400 via-gray-200 to-gray-500 rounded-sm z-10 border-r-2 border-gray-600 shadow-xl relative flex items-center justify-center">
                      <div className="w-1.5 h-full bg-black/10 absolute right-1"></div>
                    </div>
                    {/* The Barbell Sleeve */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[18px] bg-gradient-to-b from-gray-400 via-gray-300 to-gray-500 shadow-sm z-0">
                      {/* Sleeve grooves */}
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]"></div>
                    </div>
                    
                    {/* The Plates */}
                    <div className="flex items-center z-10 gap-0.5">
                      {calculatedPlates.map((plate, idx) => {
                        let colorClass = "";
                        let heightClass = "";
                        let widthClass = "";
                        
                        if (plate >= 25) { colorClass = "from-red-600 to-red-800 border-red-500 text-white"; heightClass = "h-[110px]"; widthClass = "w-8"; }
                        else if (plate >= 20) { colorClass = "from-blue-600 to-blue-800 border-blue-500 text-white"; heightClass = "h-[110px]"; widthClass = "w-7"; }
                        else if (plate >= 15) { colorClass = "from-yellow-500 to-yellow-600 border-yellow-400 text-black"; heightClass = "h-[90px]"; widthClass = "w-6"; }
                        else if (plate >= 10) { colorClass = "from-green-600 to-green-700 border-green-500 text-white"; heightClass = "h-[70px]"; widthClass = "w-5"; }
                        else if (plate >= 5) { colorClass = "from-gray-100 to-gray-300 border-white text-black"; heightClass = "h-[50px]"; widthClass = "w-4"; }
                        else if (plate >= 2.5) { colorClass = "from-gray-700 to-gray-900 border-gray-600 text-white"; heightClass = "h-[40px]"; widthClass = "w-3"; }
                        else { colorClass = "from-gray-400 to-gray-500 border-gray-300 text-black"; heightClass = "h-[30px]"; widthClass = "w-2.5"; }

                        return (
                          <div 
                            key={idx} 
                            className={`flex flex-col items-center justify-center font-black rounded-[4px] border shadow-[2px_0_5px_rgba(0,0,0,0.5)] bg-gradient-to-br ${colorClass} ${heightClass} ${widthClass} relative overflow-hidden`}
                            title={`${plate} kg`}
                          >
                            {/* Inner plate ring */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[22px] bg-black/20 border-y border-black/40"></div>
                            
                            {/* Number label - only show if wide enough */}
                            {plate >= 5 && (
                              <span className="text-[10px] sm:text-xs rotate-90 z-10 text-shadow tracking-tighter mix-blend-hard-light">{plate}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                  {availablePlates.map(plate => {
                    let colorDot = "";
                    if (plate >= 25) colorDot = "bg-red-500";
                    else if (plate >= 20) colorDot = "bg-blue-500";
                    else if (plate >= 15) colorDot = "bg-yellow-500";
                    else if (plate >= 10) colorDot = "bg-green-500";
                    else if (plate >= 5) colorDot = "bg-white";
                    else if (plate >= 2.5) colorDot = "bg-gray-700";
                    else colorDot = "bg-gray-400";

                    return (
                      <button
                        key={plate}
                        onClick={() => setLoadedPlates(p => ({ ...p, [plate]: (p[plate] || 0) + 1 }))}
                        className={`bg-noir-surface border py-4 rounded-xl font-black text-lg hover:scale-105 transition-all relative overflow-hidden flex items-center justify-center gap-1 ${
                          loadedPlates[plate] > 0 ? 'border-noir-accent shadow-[0_0_10px_rgba(208,56,243,0.2)]' : 'border-noir-border'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${colorDot} mr-1`}></div>
                        {plate}
                        {loadedPlates[plate] > 0 && (
                          <div className="absolute inset-0 bg-noir-accent/10 flex items-center justify-center">
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-noir-accent text-black rounded-bl-xl text-xs flex items-center justify-center font-black">
                              {loadedPlates[plate]}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
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
