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
        
        <div className="w-full bg-black relative flex items-center justify-center overflow-hidden aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={videoUrl} 
            alt={exerciseName}
            className="w-full h-full object-contain bg-white"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
