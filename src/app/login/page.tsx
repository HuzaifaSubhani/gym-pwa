"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        
        // Supabase often requires email verification by default.
        // For ease of use in a group of buddies, you might want to turn off "Confirm email" in Supabase settings.
        if (data.user && data.session) {
          router.push("/");
        } else {
          setError("Check your email for the confirmation link!");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-[100dvh] items-center justify-center bg-noir-bg p-4">
      <div className="w-full max-w-md bg-noir-surface border border-noir-border rounded-xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-noir-accent">Gym PWA</h1>
          <p className="text-sm text-noir-text-muted mt-2">Join your buddies on the leaderboard</p>
        </header>

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent transition-colors"
              placeholder="gymbro@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-noir-accent hover:bg-[#2cff05] text-noir-bg font-bold py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? "Sign Up" : "Log In")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm text-noir-text-muted hover:text-noir-accent transition-colors"
          >
            {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </main>
  );
}
