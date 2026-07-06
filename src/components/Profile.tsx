"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Camera, LogOut } from "lucide-react";

type ProfileData = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setMyProfile(data);
          setEditUsername(data.username || "");
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !myProfile) return;
    
    setSaveStatus("saving");
    const { error } = await supabase.from("profiles").update({ username: editUsername }).eq("id", user.id);
    if (!error) {
      setMyProfile({ ...myProfile, username: editUsername });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("idle");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    
    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    
    if (uploadError) {
      console.error(uploadError);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    
    if (myProfile) {
      setMyProfile({ ...myProfile, avatar_url: publicUrl });
    }
    setUploadingAvatar(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-noir-text-muted animate-in fade-in">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading Profile...</p>
      </div>
    );
  }

  if (!user || !myProfile) {
    return (
      <div className="p-8 text-center text-noir-text-muted">
        Not logged in.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Settings</h2>
        <h1 className="text-3xl font-black">Profile</h1>
      </header>

      <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative group cursor-pointer mb-3">
            {myProfile.avatar_url ? (
              <img src={myProfile.avatar_url} alt="DP" className="w-28 h-28 rounded-full border-2 border-noir-accent object-cover shadow-[0_0_15px_rgba(57,255,20,0.2)]" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-noir-bg border-2 border-dashed border-noir-border flex items-center justify-center text-3xl font-bold">
                {myProfile.username.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white mb-1" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
              disabled={uploadingAvatar}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
          </div>
          {uploadingAvatar && <p className="text-xs text-noir-accent animate-pulse font-bold tracking-widest uppercase">Uploading...</p>}
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-noir-text-muted uppercase mb-2 ml-1">Display Name</label>
            <input 
              required 
              type="text" 
              value={editUsername} 
              onChange={e => setEditUsername(e.target.value)} 
              className="w-full bg-noir-bg border border-noir-border rounded-lg p-4 text-lg font-bold text-noir-text focus:outline-none focus:border-noir-accent transition-colors" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={saveStatus === "saving" || editUsername === myProfile.username} 
            className="w-full px-4 py-4 rounded-lg bg-noir-accent text-noir-bg hover:bg-[#2cff05] font-black tracking-wider uppercase disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(57,255,20,0.2)] flex justify-center items-center gap-2"
          >
            {saveStatus === "saving" ? <Loader2 className="animate-spin" size={20} /> : saveStatus === "saved" ? "Saved!" : "Update Profile"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-noir-border">
          <button 
            type="button" 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full px-4 py-4 rounded-lg bg-red-900/10 text-red-500 border border-red-900/50 hover:bg-red-900/30 font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
