"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Heart, Share2, Medal, User as UserIcon, Trash2 } from "lucide-react";

type FeedPost = {
  id: string;
  user_id: string;
  type: string;
  content: any;
  likes: string[];
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
    avatar_position?: number;
  };
};

export default function SocialFeed({ currentUser }: { currentUser: any }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    
    // Fetch posts
    const { data: feedData, error: feedError } = await supabase
      .from("community_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (feedError || !feedData) {
      setLoading(false);
      return;
    }
    
    // Fetch profiles for the users
    const userIds = [...new Set(feedData.map(post => post.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, avatar_position")
      .in("id", userIds);
      
    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);
    
    const enhancedPosts = feedData.map(post => ({
      ...post,
      profile: profileMap[post.user_id] || { username: "Unknown Lifter" }
    }));
    
    setPosts(enhancedPosts);
    setLoading(false);
  };

  const deletePost = async (postId: string) => {
    setDeletingPost(postId);
    const { error } = await supabase
      .from("community_feed")
      .delete()
      .eq("id", postId);
      
    if (!error) {
      setPosts(posts.filter(p => p.id !== postId));
    }
    setDeletingPost(null);
  };

  const toggleLike = async (postId: string, currentLikes: string[]) => {
    if (!currentUser) return;
    setLikingPost(postId);
    
    const hasLiked = currentLikes.includes(currentUser.id);
    let newLikes = [...currentLikes];
    
    if (hasLiked) {
      newLikes = newLikes.filter(id => id !== currentUser.id);
    } else {
      newLikes.push(currentUser.id);
    }
    
    const { error } = await supabase
      .from("community_feed")
      .update({ likes: newLikes })
      .eq("id", postId);
      
    if (!error) {
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
    }
    setLikingPost(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-noir-text-muted animate-in fade-in">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading the feed...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center bg-noir-surface rounded-xl border border-noir-border shadow-lg mt-4">
        <Medal className="mx-auto mb-4 text-noir-text-muted opacity-50" size={48} />
        <p className="text-noir-text-muted">No one has shared anything yet. Be the first to share a PR!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-4 animate-in fade-in duration-500">
      {posts.map(post => {
        const hasLiked = currentUser ? post.likes?.includes(currentUser.id) : false;
        
        return (
          <div key={post.id} className="bg-noir-surface border border-noir-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {post.profile.avatar_url ? (
                <img 
                  src={post.profile.avatar_url} 
                  alt="DP" 
                  className="w-10 h-10 rounded-full border border-noir-border object-cover"
                  style={{ objectPosition: `50% ${post.profile.avatar_position ?? 50}%` }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center text-noir-text-muted">
                  <UserIcon size={20} />
                </div>
              )}
              <div>
                <h3 className="font-bold text-white text-sm">{post.profile.username}</h3>
                <p className="text-[10px] text-noir-text-muted uppercase tracking-widest">
                  {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-[9px] uppercase font-bold tracking-widest text-noir-accent bg-noir-accent/10 px-2 py-1 rounded-full border border-noir-accent/30">
                  NEW PR
                </span>
              </div>
            </div>

            {/* Content (PR Card) */}
            {post.type === 'pr_shared' && post.content && (
              <div className="bg-noir-bg/50 border border-white/5 rounded-xl p-4 mb-4 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] transform translate-x-4 -translate-y-4 rounded-full" style={{ color: post.content.color || '#fff' }}></div>
                
                <h4 className="text-lg font-black text-white mb-2 relative z-10" style={{ textShadow: `0 0 20px ${post.content.color || '#ffffff'}40` }}>
                  {post.content.name}
                </h4>
                
                <div className="flex items-end gap-2 relative z-10">
                  <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                    {post.content.weight}
                  </span>
                  <span className="text-sm font-bold text-noir-text-muted mb-1 uppercase tracking-widest">kg</span>
                  <span className="mx-2 text-noir-border">|</span>
                  <span className="text-2xl font-bold text-white drop-shadow-md">{post.content.reps}</span>
                  <span className="text-xs font-bold text-noir-text-muted mb-1 uppercase tracking-widest">reps</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-noir-border/50">
              <button 
                onClick={() => toggleLike(post.id, post.likes || [])}
                disabled={likingPost === post.id || !currentUser}
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  hasLiked ? 'text-red-500' : 'text-noir-text-muted hover:text-white'
                }`}
              >
                {likingPost === post.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Heart size={16} className={hasLiked ? "fill-red-500" : ""} />
                )}
                <span>{(post.likes || []).length}</span>
              </button>
              
              {currentUser && currentUser.id === post.user_id && (
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingPost === post.id}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-noir-text-muted hover:text-red-500 transition-colors"
                >
                  {deletingPost === post.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
