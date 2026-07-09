"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Eye, EyeOff, ArrowLeft, Dumbbell, ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const PasswordInput = ({ value, setter, label, placeholder, showPassword, setShowPassword }: any) => (
  <div>
    <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">{label}</label>
    <div className="relative">
      <input
        required
        id={label.toLowerCase().replace(/\s/g, '')}
        name={label.toLowerCase().replace(/\s/g, '')}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => setter(e.target.value)}
        autoComplete={label === "Password" ? "current-password" : label === "New Password" ? "new-password" : "off"}
        className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 pr-10 text-noir-text focus:outline-none focus:border-noir-accent transition-colors"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-noir-text-muted hover:text-noir-accent transition-colors"
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is arriving from a password reset email
    if (typeof window !== 'undefined' && window.location.hash.includes("type=recovery")) {
      setAuthMode("reset");
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Grab values from DOM directly to bypass any Autofill bugs
    const form = e.target as HTMLFormElement;
    const domEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value || email;
    const domPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value || password;
    const domUsername = (form.elements.namedItem('username') as HTMLInputElement)?.value || username;
    const domConfirm = (form.elements.namedItem('confirmpassword') as HTMLInputElement)?.value || confirmPassword;
    const domNewPassword = (form.elements.namedItem('newpassword') as HTMLInputElement)?.value || password;

    const activePassword = authMode === 'reset' ? domNewPassword : domPassword;

    try {
      if (authMode === "signup") {
        if (activePassword !== domConfirm) {
          throw new Error("Passwords do not match");
        }
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: domEmail,
          password: activePassword,
          options: {
            data: {
              username: domUsername
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user && data.session) {
          if (window.PasswordCredential) {
            try {
              const cred = new (window as any).PasswordCredential({
                id: domEmail,
                password: activePassword,
                name: domUsername || domEmail
              });
              await navigator.credentials.store(cred);
            } catch (e) { console.error("Credential store error", e); }
          }
          router.push("/");
        } else {
          setSuccessMsg("Check your email for the confirmation link!");
        }
      } else if (authMode === "login") {
        let loginEmail = domEmail;
        
        // If it doesn't look like an email, assume it's a username and try to resolve it
        if (!loginEmail.includes('@')) {
          const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_from_username', { p_username: loginEmail });
          if (resolvedEmail) {
            loginEmail = resolvedEmail;
          } else {
            throw new Error("Username not found");
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: activePassword,
        });
        
        if (signInError) throw signInError;
        
        if (window.PasswordCredential) {
          try {
            const cred = new (window as any).PasswordCredential({
              id: domEmail,
              password: activePassword,
              name: domEmail
            });
            await navigator.credentials.store(cred);
          } catch (e) { console.error("Credential store error", e); }
        }
        
        router.push("/");
      } else if (authMode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(domEmail, {
          redirectTo: `${window.location.origin}/login`,
        });
        
        if (resetError) throw resetError;
        
        setAuthMode("login");
        setSuccessMsg("Password reset email sent! Check your inbox.");
      } else if (authMode === "reset") {
        if (activePassword !== domConfirm) {
          throw new Error("Passwords do not match");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: activePassword
        });

        if (updateError) throw updateError;
        
        setSuccessMsg("Password updated successfully! You can now log in.");
        setAuthMode("login");
        setPassword("");
        setConfirmPassword("");
        // Clear the hash so they don't get stuck in reset mode
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <main className="flex-1 flex flex-col min-h-[100dvh] items-center bg-noir-bg p-4 md:p-8 overflow-y-auto relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-noir-accent/10 blur-[120px] rounded-full pointer-events-none fixed"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-noir-accent/5 blur-[120px] rounded-full pointer-events-none fixed"></div>
      
      <div className="w-full max-w-md bg-noir-surface/80 backdrop-blur-md border border-noir-border rounded-2xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 my-auto z-10 flex-shrink-0">
        <header className="mb-8 text-center relative flex flex-col items-center">
          {(authMode === "forgot" || authMode === "signup") && (
            <button 
              onClick={() => { setAuthMode("login"); setError(null); setSuccessMsg(null); }}
              className="absolute left-0 top-1 text-noir-text-muted hover:text-noir-accent transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          
          <div className="w-16 h-16 bg-noir-bg rounded-2xl border border-noir-border shadow-[0_0_20px_rgba(57,255,20,0.15)] flex items-center justify-center mb-4">
            <Dumbbell className="text-noir-accent" size={32} />
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-tight">IRON<span className="text-noir-accent">CORE</span></h1>
          <p className="text-sm text-noir-text-muted mt-2 font-medium">
            {authMode === "login" && "Enter the forge."}
            {authMode === "signup" && "Forge your legacy."}
            {authMode === "forgot" && "Recover your access."}
            {authMode === "reset" && "Secure your account."}
          </p>
        </header>

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-900/20 border border-green-900 text-green-400 p-3 rounded-lg mb-6 text-sm text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {(authMode === "login" || authMode === "signup" || authMode === "forgot") && (
            <div>
              <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Username or Email</label>
              <input
                required
                id="email"
                name="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent transition-colors"
                placeholder="Ronnie or gymbro@example.com"
              />
            </div>
          )}

          {authMode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-noir-text-muted uppercase mb-1">Username</label>
              <input
                required
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-noir-text focus:outline-none focus:border-noir-accent transition-colors"
                placeholder="Ronnie"
              />
            </div>
          )}

          {(authMode === "login" || authMode === "signup" || authMode === "reset") && (
            <PasswordInput 
              value={password} 
              setter={setPassword} 
              label={authMode === "reset" ? "New Password" : "Password"} 
              placeholder="••••••••" 
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          )}

          {(authMode === "signup" || authMode === "reset") && (
            <PasswordInput 
              value={confirmPassword} 
              setter={setConfirmPassword} 
              label="Confirm Password" 
              placeholder="••••••••" 
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-noir-accent hover:bg-[#2cff05] text-noir-bg font-bold py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              authMode === "login" ? "Log In" :
              authMode === "signup" ? "Sign Up" :
              authMode === "forgot" ? "Send Reset Link" : "Update Password"
            )}
          </button>

          {authMode === "login" && (
            <button
              type="button"
              onClick={() => {
                // Instantly focus to trigger native OS autofill keyboard without API delays
                const el = document.getElementById('password');
                if (el) el.focus();
              }}
              disabled={isLoading}
              className="w-full bg-transparent border border-noir-border hover:border-noir-accent text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-noir-text-muted" size={20} />
              ) : (
                <ScanFace size={20} className="text-noir-accent" />
              )}
              {isLoading ? "Scanning..." : "Face ID"}
            </button>
          )}
        </form>

        {authMode === "login" && (
          <div className="mt-6 flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={() => { setAuthMode("forgot"); setError(null); setSuccessMsg(null); }}
              className="text-sm text-noir-text-muted hover:text-white transition-colors"
            >
              Forgot your password?
            </button>
            <div className="w-full h-px bg-noir-border my-2"></div>
            <button
              type="button"
              onClick={() => { setAuthMode("signup"); setError(null); setSuccessMsg(null); }}
              className="text-sm font-bold text-noir-text-muted hover:text-noir-accent transition-colors"
            >
              Need an account? Sign Up
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
