"use client";

import { useProtocol } from "@/hooks/useProtocolStore";
import { Play, Pause, X, Plus, Minus, BellRing } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function RestTimer() {
  const timer = useProtocol(s => s.state.timer);
  const updateTimer = useProtocol(s => s.updateTimer);
  const [timeLeft, setTimeLeft] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio lazily to avoid hydration mismatch
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...");
    // We'll use a simple silent base64 audio and then actually fetch a real bell sound from a public URL or use synthesis
  }, []);

  useEffect(() => {
    if (!timer.isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timer.endTime - now) / 1000));
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        updateTimer({ isActive: false });
        
        // Play sound
        try {
          // Simple beep using Web Audio API for better browser compatibility without external assets
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
          osc.stop(ctx.currentTime + 1);
          
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
          }
        } catch (e) {
          console.error("Audio playback failed", e);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timer.endTime, timer.isActive, updateTimer]);

  if (!timer.isActive && timeLeft === 0 && !timer.isPaused) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const addTime = (seconds: number) => {
    updateTimer({ endTime: timer.endTime + seconds * 1000 });
  };

  const dismiss = () => {
    updateTimer({ isActive: false, isPaused: false });
    setTimeLeft(0);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-noir-surface/95 backdrop-blur-md border border-noir-border rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        
        <div className="flex-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-noir-accent flex items-center justify-center bg-noir-accent/10">
            <BellRing className="text-noir-accent animate-pulse" size={20} />
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-widest">Rest Timer</span>
            <span className="text-2xl font-black font-mono leading-none">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => addTime(-10)} 
            className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center hover:text-noir-accent hover:border-noir-accent transition-colors text-xs font-bold"
          >
            -10s
          </button>
          <button 
            onClick={() => addTime(10)} 
            className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center hover:text-noir-accent hover:border-noir-accent transition-colors text-xs font-bold"
          >
            +10s
          </button>
          <div className="w-px h-8 bg-noir-border mx-1"></div>
          <button 
            onClick={dismiss} 
            className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 hover:border-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
