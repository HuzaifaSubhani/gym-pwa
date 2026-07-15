"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Heart, Share2, Medal, User as UserIcon, Trash2, MessageCircle, Send, Edit2, X, CornerDownRight } from "lucide-react";

type FeedComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
    avatar_position?: number;
  };
};

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
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Interaction states
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  
  // Commenting states
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Record<string, FeedComment | null>>({});
  const [editingComment, setEditingComment] = useState<FeedComment | null>(null);
  const [editInput, setEditInput] = useState("");
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedAndComments();
  }, []);

  const fetchFeedAndComments = async () => {
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
    
    // Fetch profiles for posts
    const postUserIds = [...new Set(feedData.map(post => post.user_id))];
    const { data: postProfiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, avatar_position")
      .in("id", postUserIds);
      
    const postProfileMap = (postProfiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);
    
    const enhancedPosts = feedData.map(post => ({
      ...post,
      profile: postProfileMap[post.user_id] || { username: "Unknown Lifter" }
    }));
    
    // Fetch all comments for these posts
    const postIds = enhancedPosts.map(p => p.id);
    const { data: commentsData } = await supabase
      .from("feed_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    // Fetch profiles for comments
    let commentsByPost: Record<string, FeedComment[]> = {};
    
    if (commentsData && commentsData.length > 0) {
      const commentUserIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: commentProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, avatar_position")
        .in("id", commentUserIds);
        
      const commentProfileMap = (commentProfiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
      
      const enhancedComments = commentsData.map(c => ({
        ...c,
        profile: commentProfileMap[c.user_id] || { username: "Unknown Lifter" }
      }));
      
      enhancedComments.forEach(c => {
        if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push(c as FeedComment);
      });
    }

    setPosts(enhancedPosts);
    setComments(commentsByPost);
    setLoading(false);
  };

  const deletePost = async (postId: string) => {
    setDeletingPost(postId);
    const { error } = await supabase.from("community_feed").delete().eq("id", postId);
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
    
    const { error } = await supabase.from("community_feed").update({ likes: newLikes }).eq("id", postId);
    if (!error) {
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
    }
    setLikingPost(null);
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const submitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || !currentUser) return;
    
    setSubmittingComment(postId);
    const parentId = replyingTo[postId]?.id || null;
    
    const newComment = {
      post_id: postId,
      user_id: currentUser.id,
      content,
      parent_id: parentId
    };

    const { data, error } = await supabase.from("feed_comments").insert(newComment).select().single();
    
    if (!error && data) {
      // Fetch my profile info to inject instantly
      const { data: myProfile } = await supabase.from("profiles").select("username, avatar_url, avatar_position").eq("id", currentUser.id).single();
      
      const enhancedNewComment: FeedComment = {
        ...data,
        profile: myProfile || { username: "You" }
      };

      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), enhancedNewComment]
      }));
      
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      setReplyingTo(prev => ({ ...prev, [postId]: null }));
    }
    setSubmittingComment(null);
  };

  const submitEditComment = async (commentId: string, postId: string) => {
    const content = editInput.trim();
    if (!content) return;
    
    const { error } = await supabase.from("feed_comments").update({ content }).eq("id", commentId);
    if (!error) {
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content } : c)
      }));
      setEditingComment(null);
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    setDeletingComment(commentId);
    const { error } = await supabase.from("feed_comments").delete().eq("id", commentId);
    if (!error) {
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId && c.parent_id !== commentId) // cascade delete replies locally
      }));
    }
    setDeletingComment(null);
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
        const postComments = comments[post.id] || [];
        const isExpanded = expandedComments.includes(post.id);
        const replyTarget = replyingTo[post.id];
        
        // Group comments into threads (parent -> replies)
        const rootComments = postComments.filter(c => !c.parent_id);
        const replies = postComments.filter(c => c.parent_id);
        
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
              <div className="flex gap-4">
                <button 
                  onClick={() => toggleLike(post.id, post.likes || [])}
                  disabled={likingPost === post.id || !currentUser}
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    hasLiked ? 'text-red-500' : 'text-noir-text-muted hover:text-white'
                  }`}
                >
                  {likingPost === post.id ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} className={hasLiked ? "fill-red-500" : ""} />}
                  <span>{(post.likes || []).length}</span>
                </button>

                <button 
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isExpanded ? 'text-noir-accent' : 'text-noir-text-muted hover:text-white'
                  }`}
                >
                  <MessageCircle size={16} />
                  <span>{postComments.length}</span>
                </button>
              </div>
              
              {currentUser && currentUser.id === post.user_id && (
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingPost === post.id}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-noir-text-muted hover:text-red-500 transition-colors"
                >
                  {deletingPost === post.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </div>

            {/* Comments Section */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-noir-border/30 space-y-4 animate-in slide-in-from-top-2 fade-in">
                {/* Comment List */}
                <div className="space-y-4">
                  {rootComments.map(comment => {
                    const commentReplies = replies.filter(r => r.parent_id === comment.id);
                    
                    const renderComment = (c: FeedComment, isReply: boolean = false) => {
                      const isMyComment = currentUser?.id === c.user_id;
                      const isEditing = editingComment?.id === c.id;

                      return (
                        <div key={c.id} className={`${isReply ? 'ml-8 mt-3 relative' : ''}`}>
                          {isReply && <div className="absolute -left-6 top-0 bottom-0 w-px bg-noir-border/50" />}
                          {isReply && <CornerDownRight size={12} className="absolute -left-6 top-3 text-noir-border/50" />}
                          
                          <div className="flex gap-3">
                            {c.profile.avatar_url ? (
                              <img src={c.profile.avatar_url} alt="DP" className="w-8 h-8 rounded-full border border-noir-border object-cover flex-shrink-0" style={{ objectPosition: `50% ${c.profile.avatar_position ?? 50}%` }} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-noir-bg border border-noir-border flex items-center justify-center text-noir-text-muted text-xs flex-shrink-0"><UserIcon size={14} /></div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="bg-noir-bg rounded-xl p-3 border border-noir-border">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-xs text-white">{c.profile.username}</span>
                                  <span className="text-[9px] text-noir-text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                {isEditing ? (
                                  <div className="mt-2">
                                    <textarea
                                      value={editInput}
                                      onChange={(e) => setEditInput(e.target.value)}
                                      className="w-full bg-black/50 border border-noir-border rounded-lg p-2 text-xs text-white focus:border-noir-accent focus:outline-none min-h-[60px]"
                                      autoFocus
                                    />
                                    <div className="flex gap-2 justify-end mt-2">
                                      <button onClick={() => setEditingComment(null)} className="text-[10px] font-bold text-noir-text-muted hover:text-white px-2 py-1">Cancel</button>
                                      <button onClick={() => submitEditComment(c.id, post.id)} className="text-[10px] font-bold text-noir-accent bg-noir-accent/10 px-3 py-1 rounded-lg">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-300 break-words leading-relaxed">{c.content}</p>
                                )}
                              </div>
                              
                              {!isEditing && (
                                <div className="flex gap-4 mt-1.5 ml-1">
                                  {!isReply && (
                                    <button 
                                      onClick={() => setReplyingTo(prev => ({ ...prev, [post.id]: c }))}
                                      className="text-[10px] font-bold text-noir-text-muted hover:text-white"
                                    >
                                      Reply
                                    </button>
                                  )}
                                  {isMyComment && (
                                    <>
                                      <button 
                                        onClick={() => { setEditingComment(c); setEditInput(c.content); }}
                                        className="text-[10px] font-bold text-noir-text-muted hover:text-blue-400 flex items-center gap-1"
                                      >
                                        <Edit2 size={10} /> Edit
                                      </button>
                                      <button 
                                        onClick={() => deleteComment(c.id, post.id)}
                                        disabled={deletingComment === c.id}
                                        className="text-[10px] font-bold text-noir-text-muted hover:text-red-500 flex items-center gap-1"
                                      >
                                        {deletingComment === c.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div key={comment.id}>
                        {renderComment(comment)}
                        {commentReplies.map(reply => renderComment(reply, true))}
                      </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className="mt-4 pt-4 border-t border-noir-border/30">
                  {replyTarget && (
                    <div className="flex items-center justify-between bg-noir-accent/10 border border-noir-accent/30 rounded-t-xl px-3 py-1.5 mb-1 text-xs">
                      <span className="text-noir-text-muted">Replying to <span className="font-bold text-noir-accent">{replyTarget.profile.username}</span></span>
                      <button onClick={() => setReplyingTo(prev => ({...prev, [post.id]: null}))} className="text-noir-text-muted hover:text-white"><X size={14} /></button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                      className={`w-full bg-noir-bg border border-noir-border px-4 py-3 pr-12 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-noir-accent transition-colors ${replyTarget ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'}`}
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={!commentInputs[post.id]?.trim() || submittingComment === post.id}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-noir-accent disabled:text-noir-text-muted disabled:opacity-50 transition-colors bg-noir-accent/10 rounded-lg"
                    >
                      {submittingComment === post.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
