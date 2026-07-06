"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Camera, LogOut, Trash2, CheckCircle2 } from "lucide-react";

type ProfileData = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position: number;
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  
  const [editUsername, setEditUsername] = useState("");
  const [avatarPosition, setAvatarPosition] = useState(50);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setMyProfile({ ...data, avatar_position: data.avatar_position ?? 50 });
          setEditUsername(data.username || "");
          setAvatarPosition(data.avatar_position ?? 50);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !myProfile) return;
    
    setSaveStatus("saving");
    const { error } = await supabase.from("profiles").update({ 
      username: editUsername,
      avatar_position: avatarPosition 
    }).eq("id", user.id);
    
    if (!error) {
      setMyProfile({ ...myProfile, username: editUsername, avatar_position: avatarPosition });
      setSaveStatus("saved");
      showToast("Profile updated successfully!");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("idle");
      showToast("Error updating profile.");
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
      showToast("Error uploading avatar.");
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    
    if (myProfile) {
      setMyProfile({ ...myProfile, avatar_url: publicUrl });
    }
    setUploadingAvatar(false);
    showToast("Avatar uploaded successfully!");
  };

  const handleDeleteAccount = async () => {
    // Attempt to call RPC delete_user
    const { error } = await supabase.rpc("delete_user");
    if (!error) {
       await supabase.auth.signOut();
       window.location.href = '/login';
    } else {
       showToast("Failed to delete account. Did you run the SQL script?");
       setShowDeleteDialog(false);
    }
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-noir-accent text-black font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-10">
          <CheckCircle2 size={16} />
          <span className="text-sm">{toastMsg}</span>
        </div>
      )}

      <header className="mb-6 px-2">
        <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Settings</h2>
        <h1 className="text-3xl font-black tracking-tight">Profile</h1>
      </header>

      <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative group cursor-pointer mb-3">
            {myProfile.avatar_url ? (
              <img 
                src={myProfile.avatar_url} 
                alt="DP" 
                style={{ objectPosition: `50% ${avatarPosition}%` }}
                className="w-28 h-28 rounded-full border-2 border-noir-accent object-cover shadow-[0_0_15px_rgba(57,255,20,0.2)]" 
              />
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
          {uploadingAvatar && <p className="text-xs text-noir-accent animate-pulse font-bold tracking-widest uppercase mb-2">Uploading...</p>}
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
          
          {myProfile.avatar_url && (
            <div>
              <div className="flex justify-between items-end mb-2 ml-1">
                <label className="block text-xs font-bold text-noir-text-muted uppercase">Avatar Vertical Focus</label>
                <span className="text-xs font-bold text-noir-accent">{avatarPosition}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={avatarPosition} 
                onChange={(e) => setAvatarPosition(Number(e.target.value))}
                className="w-full h-2 bg-noir-bg rounded-lg appearance-none cursor-pointer accent-noir-accent"
              />
              <p className="text-[10px] text-noir-text-muted text-center mt-2 italic">Slide to adjust head/body framing</p>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={saveStatus === "saving" || (editUsername === myProfile.username && avatarPosition === myProfile.avatar_position)} 
            className="w-full px-4 py-4 rounded-lg bg-noir-accent text-noir-bg hover:bg-[#2cff05] font-black tracking-wider uppercase disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(57,255,20,0.2)] flex justify-center items-center gap-2"
          >
            {saveStatus === "saving" ? <Loader2 className="animate-spin" size={20} /> : saveStatus === "saved" ? "Saved!" : "Save Changes"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-noir-border space-y-3">
          <button 
            type="button" 
            onClick={() => setShowLogoutDialog(true)}
            className="w-full px-4 py-4 rounded-lg bg-red-900/10 text-red-500 border border-red-900/50 hover:bg-red-900/30 font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
          >
            <LogOut size={18} /> Log Out
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowDeleteDialog(true)}
            className="w-full px-4 py-2 text-xs text-noir-text-muted hover:text-red-500 transition-colors underline decoration-noir-border hover:decoration-red-500 flex items-center justify-center gap-1"
          >
            <Trash2 size={12} /> Delete Account
          </button>
        </div>
      </div>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-noir-surface border border-noir-border rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Ready to rest?</h2>
            <p className="text-sm text-noir-text-muted mb-6">Are you sure you want to log out of IronCore?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutDialog(false)} className="flex-1 px-4 py-3 rounded-lg border border-noir-border hover:bg-noir-bg font-bold">Cancel</button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-red-950 border border-red-900 rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2 text-red-500">Delete Account?</h2>
            <p className="text-sm text-red-200/70 mb-6">This action is permanent. All your workout logs, progress, and profile data will be destroyed forever.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteDialog(false)} className="flex-1 px-4 py-3 rounded-lg border border-red-900 hover:bg-red-900/50 text-white font-bold">Cancel</button>
              <button 
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
