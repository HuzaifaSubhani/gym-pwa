"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Camera, LogOut, Trash2, CheckCircle2, Save, ChevronDown, ChevronUp, User, Activity, Flame, Medal, Calendar, Settings } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";

type ProfileData = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position: number;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  nutrition_goal?: string;
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  
  const [editUsername, setEditUsername] = useState("");
  const [avatarPosition, setAvatarPosition] = useState(50);
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("male");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [activityLevel, setActivityLevel] = useState("1.55");
  const [nutritionGoal, setNutritionGoal] = useState("maintain");
  
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightFt, setHeightFt] = useState<number | "">("");
  const [heightIn, setHeightIn] = useState<number | "">("");
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [openSection, setOpenSection] = useState<string>("account");
  const { state } = useProtocol();
  const totalWorkouts = Object.keys(state.workoutLogs).length;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setMyProfile({ ...data, avatar_position: data.avatar_position ?? 50 });
          setEditUsername(data.username || "");
          setAvatarPosition(data.avatar_position ?? 50);
          if (data.age) setAge(data.age);
          if (data.gender) setGender(data.gender);
          if (data.height_cm) {
            setHeightCm(data.height_cm);
            const totalInches = data.height_cm / 2.54;
            setHeightFt(Math.floor(totalInches / 12));
            setHeightIn(Math.round(totalInches % 12));
          }
          if (data.weight_kg) setWeightKg(data.weight_kg);
          if (data.activity_level) setActivityLevel(data.activity_level);
          if (data.nutrition_goal) setNutritionGoal(data.nutrition_goal);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleImperialHeightChange = (f: number | "", i: number | "") => {
    setHeightFt(f);
    setHeightIn(i);
    if (f !== "" || i !== "") {
      const totalInches = (Number(f) * 12) + Number(i);
      setHeightCm(Math.round(totalInches * 2.54));
    } else {
      setHeightCm("");
    }
  };

  const handleCmHeightChange = (cm: number | "") => {
    setHeightCm(cm);
    if (cm !== "") {
      const totalInches = cm / 2.54;
      setHeightFt(Math.floor(totalInches / 12));
      setHeightIn(Math.round(totalInches % 12));
    } else {
      setHeightFt("");
      setHeightIn("");
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !myProfile) return;
    
    setSaveStatus("saving");
    const updates = { 
      username: editUsername,
      avatar_position: avatarPosition,
      age: age || null,
      gender,
      height_cm: heightCm || null,
      weight_kg: weightKg || null,
      activity_level: activityLevel,
      nutrition_goal: nutritionGoal
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    
    if (!error) {
      setMyProfile({ ...myProfile, ...updates } as ProfileData);
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

      <header className="mb-6 px-2 flex items-center justify-between">
        <div>
          <h2 className="text-xs text-noir-accent font-bold uppercase tracking-wider mb-1">Your Identity</h2>
          <h1 className="text-3xl font-black tracking-tight">Profile</h1>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-noir-surface border border-noir-border rounded-xl p-6 shadow-lg text-center relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-noir-accent/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-50%] right-[-10%] w-64 h-64 bg-noir-accent/5 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="relative group cursor-pointer inline-block mb-4">
            {myProfile.avatar_url ? (
              <img 
                src={myProfile.avatar_url} 
                alt="DP" 
                className="w-32 h-32 rounded-full border-2 border-noir-accent object-cover shadow-[0_0_20px_rgba(167,139,250,0.3)]" 
                style={{ objectPosition: `50% ${myProfile.avatar_position}%` }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-noir-bg border-2 border-dashed border-noir-border flex items-center justify-center text-4xl font-bold shadow-[0_0_20px_rgba(167,139,250,0.1)]">
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

          <h2 className="text-2xl font-black mb-1">{myProfile.username}</h2>
          <div className="inline-flex items-center gap-1 bg-noir-accent/20 text-noir-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-noir-accent/30">
            <Medal size={14} /> {totalWorkouts >= 50 ? "Elite Lifter" : totalWorkouts >= 10 ? "Dedicated" : "Initiate"}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mt-6 relative z-10 pt-6 border-t border-noir-border/50">
          <div className="flex flex-col items-center">
            <Activity className="text-noir-text-muted mb-1" size={20} />
            <span className="text-xl font-bold text-noir-accent">{totalWorkouts}</span>
            <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-wider">Workouts</span>
          </div>
          <div className="flex flex-col items-center">
            <Flame className="text-noir-text-muted mb-1" size={20} />
            <span className="text-xl font-bold text-noir-accent">{Math.floor(totalWorkouts * 1.5)}</span>
            <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-wider">Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <Calendar className="text-noir-text-muted mb-1" size={20} />
            <span className="text-xl font-bold text-noir-accent">1</span>
            <span className="text-[10px] uppercase font-bold text-noir-text-muted tracking-wider">Year</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        
        {/* Section: Account */}
        <div className="bg-noir-surface border border-noir-border rounded-xl overflow-hidden shadow-lg">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === "account" ? "" : "account")}
            className="w-full flex items-center justify-between p-4 bg-noir-surface-light/50 hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <User size={20} className="text-noir-accent" />
              <span className="font-bold uppercase tracking-wider text-sm">Account Settings</span>
            </div>
            {openSection === "account" ? <ChevronUp size={20} className="text-noir-accent" /> : <ChevronDown size={20} className="text-noir-text-muted" />}
          </button>
          
          <div className={`p-4 space-y-4 transition-all border-t border-noir-border/50 ${openSection === "account" ? "block" : "hidden"}`}>
             <div>
              <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 ml-1">Display Name</label>
              <input 
                required 
                type="text" 
                value={editUsername} 
                onChange={e => setEditUsername(e.target.value)} 
                className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-lg font-bold text-noir-text focus:outline-none focus:border-noir-accent transition-colors" 
              />
            </div>
            
            {myProfile.avatar_url && (
              <div>
                <div className="flex justify-between items-end mb-2 ml-1">
                  <label className="block text-[10px] font-bold text-noir-text-muted uppercase">Avatar Focus</label>
                  <span className="text-[10px] font-bold text-noir-accent">{avatarPosition}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={avatarPosition} 
                  onChange={(e) => setAvatarPosition(Number(e.target.value))}
                  className="w-full h-2 bg-noir-bg rounded-lg appearance-none cursor-pointer accent-noir-accent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section: Body Stats */}
        <div className="bg-noir-surface border border-noir-border rounded-xl overflow-hidden shadow-lg">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === "body" ? "" : "body")}
            className="w-full flex items-center justify-between p-4 bg-noir-surface-light/50 hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-noir-accent" />
              <span className="font-bold uppercase tracking-wider text-sm">Body Stats</span>
            </div>
            {openSection === "body" ? <ChevronUp size={20} className="text-noir-accent" /> : <ChevronDown size={20} className="text-noir-text-muted" />}
          </button>
          
          <div className={`p-4 transition-all border-t border-noir-border/50 ${openSection === "body" ? "block" : "hidden"}`}>
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">Age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : "")} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="flex items-center justify-between text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">
                  Height
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setHeightUnit("cm")} className={`px-1 rounded ${heightUnit === "cm" ? "bg-noir-accent text-black" : ""}`}>CM</button>
                    <button type="button" onClick={() => setHeightUnit("ft")} className={`px-1 rounded ${heightUnit === "ft" ? "bg-noir-accent text-black" : ""}`}>FT</button>
                  </div>
                </label>
                {heightUnit === "cm" ? (
                  <input type="number" value={heightCm} onChange={e => handleCmHeightChange(e.target.value ? Number(e.target.value) : "")} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent" placeholder="cm" />
                ) : (
                  <div className="flex gap-2">
                    <input type="number" value={heightFt} onChange={e => handleImperialHeightChange(e.target.value ? Number(e.target.value) : "", heightIn)} className="w-1/2 bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent" placeholder="ft" />
                    <input type="number" value={heightIn} onChange={e => handleImperialHeightChange(heightFt, e.target.value ? Number(e.target.value) : "")} className="w-1/2 bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent" placeholder="in" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">Weight (kg)</label>
                <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value ? Number(e.target.value) : "")} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent" placeholder="kg" />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Goals */}
        <div className="bg-noir-surface border border-noir-border rounded-xl overflow-hidden shadow-lg">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === "goals" ? "" : "goals")}
            className="w-full flex items-center justify-between p-4 bg-noir-surface-light/50 hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={20} className="text-noir-accent" />
              <span className="font-bold uppercase tracking-wider text-sm">Goals</span>
            </div>
            {openSection === "goals" ? <ChevronUp size={20} className="text-noir-accent" /> : <ChevronDown size={20} className="text-noir-text-muted" />}
          </button>
          
          <div className={`p-4 space-y-4 transition-all border-t border-noir-border/50 ${openSection === "goals" ? "block" : "hidden"}`}>
              <div>
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">Activity Level</label>
                <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full bg-noir-bg border border-noir-border rounded-lg p-3 text-sm focus:outline-none focus:border-noir-accent">
                  <option value="1.2">Sedentary (Little/No Exercise)</option>
                  <option value="1.375">Lightly Active (1-3 days/week)</option>
                  <option value="1.55">Moderately Active (3-5 days/week)</option>
                  <option value="1.725">Very Active (6-7 days/week)</option>
                  <option value="1.9">Extra Active (Physical Job/Training 2x)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-1 ml-1">Nutrition Goal</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNutritionGoal("cut")} className={`flex-1 p-2 rounded-lg text-xs font-bold border transition-colors ${nutritionGoal === "cut" ? "bg-noir-accent text-noir-bg border-noir-accent" : "bg-noir-bg border-noir-border text-noir-text-muted"}`}>Cut</button>
                  <button type="button" onClick={() => setNutritionGoal("maintain")} className={`flex-1 p-2 rounded-lg text-xs font-bold border transition-colors ${nutritionGoal === "maintain" ? "bg-noir-accent text-noir-bg border-noir-accent" : "bg-noir-bg border-noir-border text-noir-text-muted"}`}>Maintain</button>
                  <button type="button" onClick={() => setNutritionGoal("bulk")} className={`flex-1 p-2 rounded-lg text-xs font-bold border transition-colors ${nutritionGoal === "bulk" ? "bg-noir-accent text-noir-bg border-noir-accent" : "bg-noir-bg border-noir-border text-noir-text-muted"}`}>Bulk</button>
                </div>
              </div>

            {/* Calories Calculator display */}
            {age && heightCm && weightKg ? (
              (() => {
                let bmr = 10 * Number(weightKg) + 6.25 * Number(heightCm) - 5 * Number(age);
                bmr += gender === "male" ? 5 : -161;
                const tdee = Math.round(bmr * Number(activityLevel));
                const target = nutritionGoal === "cut" ? tdee - 500 : nutritionGoal === "bulk" ? tdee + 500 : tdee;

                return (
                  <div className="mt-6 bg-noir-bg border border-noir-border rounded-xl p-4 flex flex-col items-center">
                    <p className="text-xs text-noir-text-muted uppercase tracking-wider font-bold mb-1">Target Daily Calories</p>
                    <p className="text-4xl font-black text-noir-accent">{target}</p>
                    <p className="text-[10px] text-noir-text-muted mt-2">Maintenance (TDEE): {tdee} kcal</p>
                  </div>
                );
              })()
            ) : (
              <p className="mt-4 text-xs text-center text-noir-text-muted">Fill out Age, Height, and Weight to calculate your target calories.</p>
            )}
          </div>
        </div>
        
        {/* Save Button */}
        <div className="pt-2">
          <button 
            type="submit" 
            disabled={
              saveStatus === "saving" || 
              (
                editUsername === myProfile.username && 
                avatarPosition === myProfile.avatar_position &&
                age === (myProfile.age || "") &&
                gender === (myProfile.gender || "male") &&
                heightCm === (myProfile.height_cm || "") &&
                weightKg === (myProfile.weight_kg || "") &&
                activityLevel === (myProfile.activity_level || "1.55") &&
                nutritionGoal === (myProfile.nutrition_goal || "maintain")
              )
            }
            className="w-full px-4 py-4 rounded-xl bg-noir-accent text-noir-bg hover:opacity-90 font-black tracking-wider uppercase disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(167,139,250,0.2)] flex justify-center items-center gap-2"
          >
            {saveStatus === "saving" ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : <><Save size={20} /> Save Changes</>}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-8 pt-8 border-t border-noir-border">
        <h2 className="text-xs text-red-500 font-bold uppercase tracking-wider mb-4 px-2">Danger Zone</h2>
        <div className="space-y-3">
          <button 
            type="button" 
            onClick={() => setShowLogoutDialog(true)}
            className="w-full px-4 py-4 rounded-xl bg-red-900/10 text-red-500 border border-red-900/50 hover:bg-red-900/30 font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
          >
            <LogOut size={18} /> Log Out
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowDeleteDialog(true)}
            className="w-full px-4 py-4 rounded-xl border border-transparent text-noir-text-muted hover:text-red-500 transition-colors underline decoration-transparent hover:decoration-red-500 flex items-center justify-center gap-2 uppercase tracking-widest text-xs font-bold"
          >
            <Trash2 size={16} /> Delete Account
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
