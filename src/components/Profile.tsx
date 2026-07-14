"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Camera, LogOut, Trash2, CheckCircle2, Save, ChevronDown, ChevronUp, User, Activity, Flame, Medal, Calendar, Settings, Trophy } from "lucide-react";
import { useProtocol } from "@/hooks/useProtocolStore";
import PersonalRecords from "./PersonalRecords";

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
  physique_tag?: string;
};

let cachedProfileData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

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
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [nutritionGoal, setNutritionGoal] = useState("maintenance");
  const [physiqueTag, setPhysiqueTag] = useState("overall");
  
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
      if (cachedProfileData && (Date.now() - cacheTime < CACHE_DURATION)) {
        setUser(cachedProfileData.user);
        const data = cachedProfileData.myProfile;
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
        if (data.physique_tag) setPhysiqueTag(data.physique_tag);
        setLoading(false);
        return;
      }
      
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
          
          cachedProfileData = {
            user,
            myProfile: { ...data, avatar_position: data.avatar_position ?? 50 }
          };
          cacheTime = Date.now();
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
      nutrition_goal: nutritionGoal,
      physique_tag: physiqueTag
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

  const compressImage = (file: File, maxSizeMB: number = 1): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);
          
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.9;
          const compress = () => {
            canvas.toBlob((blob) => {
              if (!blob) return resolve(file);
              if (blob.size / 1024 / 1024 > maxSizeMB && quality > 0.1) {
                quality -= 0.1;
                compress();
              } else {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              }
            }, 'image/jpeg', quality);
          };
          compress();
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const originalFile = e.target.files[0];
    
    setUploadingAvatar(true);
    showToast("Compressing image...");
    
    const file = await compressImage(originalFile, 1);
    
    const fileExt = file.name.split('.').pop() || 'jpg';
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

  let totalVolume = 0;
  Object.values(state.workoutLogs).forEach((dayLogs: any) => {
    Object.values(dayLogs).forEach((exLogs: any) => {
      exLogs.forEach((log: any) => {
        if (log && log.weight && log.reps) {
          totalVolume += (Number(log.weight) * Number(log.reps));
        }
      });
    });
  });

  const xp = Math.round(totalVolume / 10);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelXP = 100 * Math.pow(level - 1, 2);
  const nextLevelXP = 100 * Math.pow(level, 2);
  
  let progress = 0;
  if (nextLevelXP > currentLevelXP) {
    progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  }
  progress = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-noir-accent text-black font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-10">
          <CheckCircle2 size={16} />
          <span className="text-sm">{toastMsg}</span>
        </div>
      )}



      {/* Hero Section */}
      <div className="bg-noir-surface border border-noir-border rounded-2xl shadow-lg relative overflow-hidden group">
        <div className="p-8 text-center relative z-10 flex flex-col items-center">
          
          <div className="relative group cursor-pointer inline-block mb-4">
            {myProfile.avatar_url ? (
              <img 
                src={myProfile.avatar_url} 
                alt="DP" 
                className="w-32 h-32 rounded-full border-4 border-noir-bg object-cover shadow-lg " 
                style={{ objectPosition: `50% ${myProfile.avatar_position}%` }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-noir-bg border-4 border-noir-surface flex items-center justify-center text-5xl font-black shadow-lg ">
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

          <h2 className="text-3xl font-black mb-1">{myProfile.username}</h2>
          
          {myProfile.pinned_pr && (
            <div className="mb-4 inline-flex items-center gap-2 bg-noir-bg border border-noir-accent/30 text-noir-accent px-3 py-1.5 rounded-full shadow-lg">
              <Trophy size={14} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {myProfile.pinned_pr.name}: <span className="text-white">{myProfile.pinned_pr.weight}kg × {myProfile.pinned_pr.reps}</span>
              </span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1 mb-4">
            <span className="text-noir-accent font-bold tracking-widest uppercase text-xs">Level {level} Elite</span>
            <div className="w-48 bg-noir-bg rounded-full h-1.5 shadow-inner overflow-hidden border border-noir-border/50">
              <div className="h-full bg-noir-accent shadow-lg rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-[10px] text-noir-text-muted">{xp.toLocaleString()} XP / {nextLevelXP.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-1 relative z-10 bg-noir-bg/50 border-t border-noir-border backdrop-blur-md p-4">
          <div className="flex flex-col items-center text-center">
            <Activity className="text-noir-accent mb-1 drop-shadow-lg" size={20} />
            <span className="text-xl font-bold text-white">{totalWorkouts}</span>
            <span className="text-[9px] uppercase font-bold text-noir-text-muted tracking-widest">Workouts</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-r border-noir-border/50">
            <Flame className="text-noir-accent mb-1 drop-shadow-lg" size={20} />
            <span className="text-xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k</span>
            <span className="text-[9px] uppercase font-bold text-noir-text-muted tracking-widest">Volume (kg)</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Medal className="text-noir-accent mb-1 drop-shadow-lg" size={20} />
            <span className="text-xl font-bold text-white">{totalWorkouts >= 50 ? '3' : totalWorkouts >= 10 ? '2' : '1'}</span>
            <span className="text-[9px] uppercase font-bold text-noir-text-muted tracking-widest">Tier</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        
        {/* Section: Account */}
        <div className="bg-noir-surface/60 backdrop-blur-sm border border-noir-border rounded-xl overflow-hidden shadow-lg">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === "account" ? "" : "account")}
            className="w-full flex items-center justify-between p-5 hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <User size={20} className="text-noir-accent drop-shadow-lg" />
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
            <div>
              <label className="block text-[10px] font-bold text-noir-text-muted uppercase mb-2 ml-1 mt-4">Physique Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'overall', label: 'Overall (XP)' },
                  { id: 'classic', label: 'Classic' },
                  { id: 'aesthetic', label: 'Aesthetic' },
                  { id: 'powerlifting', label: 'Powerlifting' }
                ].map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setPhysiqueTag(tag.id)}
                    className={`p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      physiqueTag === tag.id 
                        ? 'bg-noir-accent/20 border-noir-accent text-noir-accent' 
                        : 'bg-noir-bg border-noir-border text-noir-text-muted hover:border-noir-border/80 hover:text-white'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-noir-text-muted mt-1 ml-1">Choose your primary goal to compete in specific Leaderboard brackets.</p>
            </div>
          </div>
        </div>

        {/* Section: Trophy Room (PRs) */}
        <div className="bg-noir-surface/60 backdrop-blur-sm border border-noir-border rounded-xl overflow-hidden shadow-lg">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === "trophies" ? "" : "trophies")}
            className="w-full flex items-center justify-between p-5 hover:bg-noir-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trophy size={20} className="text-yellow-500 drop-shadow-lg" />
              <span className="font-bold uppercase tracking-wider text-sm">Trophy Room (PRs)</span>
            </div>
            {openSection === "trophies" ? <ChevronUp size={20} className="text-noir-accent" /> : <ChevronDown size={20} className="text-noir-text-muted" />}
          </button>
          
          <div className={`p-4 transition-all border-t border-noir-border/50 ${openSection === "trophies" ? "block" : "hidden"}`}>
             <PersonalRecords />
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
            className="w-full px-4 py-4 rounded-xl bg-noir-accent text-noir-bg hover:opacity-90 font-black tracking-wider uppercase disabled:opacity-50 transition-colors shadow-lg flex justify-center items-center gap-2"
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
