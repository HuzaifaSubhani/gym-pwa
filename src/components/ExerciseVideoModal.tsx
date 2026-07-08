"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export default function ExerciseVideoModal({ 
  isOpen, 
  onClose, 
  videoUrl, 
  exerciseName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  videoUrl: string; 
  exerciseName: string 
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-noir-surface border border-noir-border rounded-xl overflow-hidden shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-noir-accent hover:text-black transition-colors z-10"
        >
          <X size={20} />
        </button>
        
        <div className="p-4 bg-noir-bg border-b border-noir-border">
          <h2 className="text-xl font-black">{exerciseName}</h2>
        </div>
        
        <div className="w-full bg-noir-bg relative flex flex-col items-center justify-center overflow-hidden py-8 px-4">
          <div className="relative rounded-xl overflow-hidden border-2 border-noir-border shadow-[0_0_30px_rgba(57,255,20,0.15)] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={videoUrl} 
              alt={exerciseName}
              className="w-[360px] max-w-full h-auto object-contain mix-blend-screen opacity-90 contrast-125 grayscale"
              loading="lazy"
              style={{ imageRendering: 'crisp-edges' }}
            />
            {/* Scanline overlay for aesthetic */}
            <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
          </div>
          <p className="text-[10px] text-noir-text-muted mt-4 uppercase tracking-widest font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-noir-accent animate-pulse"></span>
            Lo-Fi Dataset Render
          </p>
        </div>
      </div>
    </div>
  );
}
