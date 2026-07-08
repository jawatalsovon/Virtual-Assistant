"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Mic, LogOut, MessageSquare, PlusCircle, User, Loader2, Menu, X, Settings, Trash2, CheckCircle, Circle, Pencil, Check } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Good morning! How can I help you today?" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notesByTopic, setNotesByTopic] = useState<Record<string, any[]>>({});
  const [tasksByCategory, setTasksByCategory] = useState<Record<string, any[]>>({});
  const [showAllChats, setShowAllChats] = useState(false);
  const [showNotesFullscreen, setShowNotesFullscreen] = useState(false);
  const [showTasksFullscreen, setShowTasksFullscreen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskContent, setEditTaskContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEmptyState = messages.length <= 1;
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Preload voices for TTS to avoid empty voices array on mobile/safari
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Auth Protection
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchConversations();
      fetchNotes();
      fetchTasks();
    }
  }, [status, router]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        const grouped: Record<string, any[]> = {};
        data.notes?.forEach((n: any) => {
          const t = n.topic || 'General';
          if (!grouped[t]) grouped[t] = [];
          grouped[t].push(n);
        });
        setNotesByTopic(grouped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        const grouped: Record<string, any[]> = {};
        data.tasks?.forEach((t: any) => {
          const cat = t.category || 'General';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(t);
        });
        setTasksByCategory(grouped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchNotes();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTask = async (id: string, is_done: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done })
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const saveNoteEdit = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editNoteContent })
      });
      if (res.ok) {
        setEditingNoteId(null);
        fetchNotes();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveTaskEdit = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editTaskContent })
      });
      if (res.ok) {
        setEditingTaskId(null);
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        // Remove system prompt and tool messages from the UI view if necessary, or let the UI handle it.
        // Actually the backend returns all messages. We can just set them.
        setMessages(data.messages);
        setConversationId(id);
        setIsMobileMenuOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#>]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    const savedVoiceURI = localStorage.getItem("nova_voice_uri");
    let selectedVoice = null;
    
    if (savedVoiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === savedVoiceURI);
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.name.includes('Female') || v.name.includes('Samantha') || 
        v.name.includes('Google UK English Female') || v.name.includes('Zira')
      );
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;

    const savedSpeed = localStorage.getItem("nova_voice_speed");
    if (savedSpeed) utterance.rate = parseFloat(savedSpeed);
    
    utterance.onstart = () => setIsAssistantSpeaking(true);
    utterance.onend = () => setIsAssistantSpeaking(false);
    utterance.onerror = () => setIsAssistantSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([{ role: "assistant", content: "Started a new conversation. How can I help you?" }]);
    fetchConversations(); // refresh the list
  };

  const sendTextMessage = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    const text = inputText.trim();
    setInputText("");
    const updatedMessages: Message[] = [...messages, { role: "user" as const, content: text }];
    setMessages(updatedMessages);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });
      
      const data = await res.json();
      if (res.ok) {
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
          fetchConversations(); // new conversation created, fetch list
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        speakText(data.reply);
        fetchNotes();
        fetchTasks();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (isProcessing) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsAssistantSpeaking(false);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        setIsProcessing(true);
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append("file", audioBlob, "voice.webm");
        if (conversationId) formData.append("conversationId", conversationId);

        try {
          const res = await fetch("/api/voice", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok) {
            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
              fetchConversations();
            }
            setMessages((prev) => [
              ...prev,
              { role: "user", content: `🎙️ ${data.transcript}` },
              { role: "assistant", content: data.reply },
            ]);
            speakText(data.reply);
            fetchNotes();
            fetchTasks();
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          console.error(error);
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered a voice error." }]);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="login-container">
        <Loader2 className="spinner" size={32} style={{ border: 'none' }} />
      </div>
    );
  }

  return (
    <main className="app-container glass-panel">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--accent-color)' }}>Nova</h2>
            {isMobileMenuOpen && (
              <button className="btn-icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            )}
          </div>
          <button className="btn-primary" onClick={() => { startNewConversation(); setIsMobileMenuOpen(false); }} style={{ width: '100%' }}>
            <PlusCircle size={18} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div style={{ overflowY: 'auto', flexGrow: 1, padding: '16px 10px' }}>
          {/* Chats Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--secondary-color)', margin: '0 0 12px 12px', letterSpacing: '0.1em' }}>
              Recent Chats
            </h3>
            <ul className="conv-list" style={{ padding: 0, overflowY: 'visible', flexGrow: 0 }}>
              {(showAllChats ? conversations : conversations.slice(0, 4)).map(conv => (
                <li 
                  key={conv.id} 
                  className={`conv-item ${conversationId === conv.id ? 'active' : ''}`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> 
                  {conv.title}
                </li>
              ))}
              {conversations.length === 0 && (
                <li className="conv-item active">
                  <MessageSquare size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> 
                  Current Session
                </li>
              )}
            </ul>
            {conversations.length > 4 && (
              <button
                onClick={() => setShowAllChats(v => !v)}
                style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed rgba(139,92,246,0.3)', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '4px', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {showAllChats ? '▲ Show Less' : `▼ See ${conversations.length - 4} More`}
              </button>
            )}
          </div>

          {/* Notes Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 12px', paddingRight: '4px' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--secondary-color)', margin: 0, letterSpacing: '0.1em' }}>
                My Notes
              </h3>
            </div>
            <div className="notes-list" style={{ padding: '0 0 8px 0' }}>
              {Object.keys(notesByTopic).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--secondary-color)', fontSize: '0.85rem' }}>
                  No notes saved yet.<br/><br/>Ask me to save a note!
                </div>
              ) : (
                (() => {
                  // Flatten all notes, show first 3
                  const allNotes = Object.entries(notesByTopic).flatMap(([topic, notes]) =>
                    notes.map(n => ({ ...n, topic }))
                  );
                  const previewNotes = allNotes.slice(0, 3);
                  return (
                    <>
                      {previewNotes.map(n => (
                        <div key={n.id} style={{ position: 'relative', margin: '0 12px 8px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', lineHeight: '1.4', paddingRight: '36px' }}
                          onClick={() => { setInputText(`Regarding my note on ${n.topic}: "${n.content.substring(0, 50)}..." - `); if (window.innerWidth < 768) setIsMobileMenuOpen(false); }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        >
                          <div style={{ fontSize: '0.68rem', color: 'var(--secondary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{n.topic}</div>
                          {editingNoteId === n.id ? (
                            <input 
                              type="text" 
                              value={editNoteContent} 
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              onKeyDown={(e) => { if(e.key === 'Enter') saveNoteEdit(n.id, e); }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '0.85rem' }}
                            />
                          ) : (
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
                          )}
                          
                          <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                            {editingNoteId === n.id ? (
                              <button className="btn-icon" style={{ opacity: 0.7 }} onClick={(e) => saveNoteEdit(n.id, e)} title="Save note">
                                <Check size={14} color="var(--accent-color)" />
                              </button>
                            ) : (
                              <button className="btn-icon" style={{ opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setEditingNoteId(n.id); setEditNoteContent(n.content); }} title="Edit note">
                                <Pencil size={14} />
                              </button>
                            )}
                            <button className="btn-icon" style={{ opacity: 0.5 }} onClick={(e) => deleteNote(n.id, e)} title="Delete note">
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowNotesFullscreen(true)}
                        style={{ width: 'calc(100% - 24px)', margin: '4px 12px 0', padding: '9px', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))'}
                      >
                        See All Notes ({allNotes.length})
                      </button>
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 12px', paddingRight: '4px' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--secondary-color)', margin: 0, letterSpacing: '0.1em' }}>
                Tasks
              </h3>
            </div>
            <div className="tasks-list" style={{ padding: '0 0 8px 0' }}>
              {Object.keys(tasksByCategory).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--secondary-color)', fontSize: '0.85rem' }}>
                  No tasks yet.<br/><br/>Ask me to add a task!
                </div>
              ) : (
                (() => {
                  // Flatten all tasks, show first 3 unfinished if possible
                  const allTasks = Object.entries(tasksByCategory).flatMap(([category, tasks]) =>
                    tasks.map(t => ({ ...t, category }))
                  );
                  const previewTasks = allTasks.filter(t => !t.is_done).slice(0, 3);
                  if (previewTasks.length === 0 && allTasks.length > 0) previewTasks.push(...allTasks.slice(0, 3)); // fallback if all done

                  return (
                    <>
                      {previewTasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 12px 8px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', lineHeight: '1.4' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                        >
                          <button onClick={(e) => toggleTask(t.id, !t.is_done, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {t.is_done ? <CheckCircle size={16} color="var(--accent-color)" /> : <Circle size={16} color="var(--secondary-color)" />}
                          </button>
                          {editingTaskId === t.id ? (
                            <input 
                              type="text" 
                              value={editTaskContent} 
                              onChange={(e) => setEditTaskContent(e.target.value)}
                              onKeyDown={(e) => { if(e.key === 'Enter') saveTaskEdit(t.id, e); }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{ flexGrow: 1, background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '0.85rem' }}
                            />
                          ) : (
                            <div style={{ flexGrow: 1, textDecoration: t.is_done ? 'line-through' : 'none', color: t.is_done ? 'var(--secondary-color)' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.content}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '4px', opacity: 0.5 }}>
                            {editingTaskId === t.id ? (
                              <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => saveTaskEdit(t.id, e)} title="Save task">
                                <Check size={14} color="var(--accent-color)" />
                              </button>
                            ) : (
                              <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); setEditTaskContent(t.content); }} title="Edit task">
                                <Pencil size={14} />
                              </button>
                            )}
                            <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => deleteTask(t.id, e)} title="Delete task">
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowTasksFullscreen(true)}
                        style={{ width: 'calc(100% - 24px)', margin: '4px 12px 0', padding: '9px', background: 'transparent', border: '1px dashed rgba(139,92,246,0.3)', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        See All Tasks ({allTasks.length})
                      </button>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-header" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none' }}>
          <div className="user-menu">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="user-avatar" />
            ) : (
              <User className="user-avatar" style={{ padding: '4px' }} />
            )}
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session?.user?.name || "User"}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn-icon" onClick={() => router.push("/settings")} title="Settings">
                <Settings size={18} />
              </button>
              <button className="btn-icon" onClick={() => signOut()} title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Full-screen Notes Modal */}
      {showNotesFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNotesFullscreen(false); }}
        >
          <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-color)' }}>📋 My Notes</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>
                  {Object.values(notesByTopic).flat().length} notes saved
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowNotesFullscreen(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
                <X size={18} />
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flexGrow: 1 }}>
              {Object.keys(notesByTopic).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--secondary-color)', padding: '40px 0' }}>No notes yet.</div>
              ) : (
                Object.entries(notesByTopic).map(([topic, topicNotes]) => (
                  <div key={topic} style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-color)', margin: '0 0 12px', borderBottom: '1px solid rgba(139,92,246,0.2)', paddingBottom: '6px' }}>
                      {topic}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {topicNotes.map((n: any) => (
                        <div key={n.id}
                          style={{ position: 'relative', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.9rem', lineHeight: '1.6', cursor: 'pointer', transition: 'all 0.2s', paddingRight: '48px' }}
                          onClick={() => { setInputText(`Regarding my note on ${topic}: "${n.content.substring(0, 50)}..." - `); setShowNotesFullscreen(false); setIsMobileMenuOpen(false); }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        >
                          <div style={{ fontSize: '0.78rem', color: 'var(--secondary-color)', marginBottom: '6px' }}>
                            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          {editingNoteId === n.id ? (
                            <input 
                              type="text" 
                              value={editNoteContent} 
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              onKeyDown={(e) => { if(e.key === 'Enter') saveNoteEdit(n.id, e); }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '0.9rem', padding: 0 }}
                            />
                          ) : (
                            n.content
                          )}
                          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', opacity: 0.7 }}>
                            {editingNoteId === n.id ? (
                              <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => saveNoteEdit(n.id, e)} title="Save note">
                                <Check size={16} color="var(--accent-color)" />
                              </button>
                            ) : (
                              <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); setEditingNoteId(n.id); setEditNoteContent(n.content); }} title="Edit note">
                                <Pencil size={16} />
                              </button>
                            )}
                            <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => deleteNote(n.id, e)} title="Delete note">
                              <Trash2 size={16} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Tasks Modal */}
      {showTasksFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTasksFullscreen(false); }}
        >
          <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-color)' }}>Tasks</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>
                  {Object.values(tasksByCategory).flat().filter(t => !t.is_done).length} active tasks
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowTasksFullscreen(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px 28px', flexGrow: 1 }}>
              {Object.keys(tasksByCategory).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--secondary-color)', padding: '40px 0' }}>No tasks yet.</div>
              ) : (
                Object.entries(tasksByCategory).map(([category, catTasks]) => (
                  <div key={category} style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-color)', margin: '0 0 12px', borderBottom: '1px solid rgba(139,92,246,0.2)', paddingBottom: '6px' }}>
                      {category}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {catTasks.sort((a, b) => Number(a.is_done) - Number(b.is_done)).map((t: any) => (
                        <div key={t.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.9rem', lineHeight: '1.6', transition: 'all 0.2s' }}
                        >
                          <button onClick={(e) => toggleTask(t.id, !t.is_done, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {t.is_done ? <CheckCircle size={20} color="var(--accent-color)" /> : <Circle size={20} color="var(--secondary-color)" />}
                          </button>
                          {editingTaskId === t.id ? (
                            <input 
                              type="text" 
                              value={editTaskContent} 
                              onChange={(e) => setEditTaskContent(e.target.value)}
                              onKeyDown={(e) => { if(e.key === 'Enter') saveTaskEdit(t.id, e); }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{ flexGrow: 1, background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '0.9rem' }}
                            />
                          ) : (
                            <div style={{ flexGrow: 1, textDecoration: t.is_done ? 'line-through' : 'none', color: t.is_done ? 'var(--secondary-color)' : 'inherit' }}>
                              {t.content}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', opacity: 0.7 }}>
                            {editingTaskId === t.id ? (
                              <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => saveTaskEdit(t.id, e)} title="Save task">
                                <Check size={16} color="var(--accent-color)" />
                              </button>
                            ) : (
                              <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); setEditTaskContent(t.content); }} title="Edit task">
                                <Pencil size={16} />
                              </button>
                            )}
                            <button className="btn-icon" style={{ padding: '8px' }} onClick={(e) => deleteTask(t.id, e)} title="Delete task">
                              <Trash2 size={16} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <section className="main-chat">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-icon mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1>Nova</h1>
          </div>
        </header>

        {/* Dynamic Orb */}
        <div className={`orb-wrapper ${isEmptyState ? 'hero' : 'header-pos'}`}>
          <div 
            className={`orb-avatar ${isVoiceEnabled ? '' : 'muted'} ${isAssistantSpeaking ? 'speaking' : ''} ${isProcessing ? 'thinking' : ''}`}
            onClick={() => {
              setIsVoiceEnabled(!isVoiceEnabled);
              if (isAssistantSpeaking) {
                window.speechSynthesis.cancel();
                setIsAssistantSpeaking(false);
              }
            }}
            title={isVoiceEnabled ? "Voice ON" : "Voice OFF"}
          >
            <div className="orb-face">
              <div className="orb-eye"></div>
              <div className="orb-eye"></div>
            </div>
            <div className="orb-glow"></div>
          </div>
        </div>

        <div className="chat-history" ref={chatHistoryRef} style={{ opacity: isEmptyState ? 0 : 1, transition: 'opacity 0.5s ease', pointerEvents: isEmptyState ? 'none' : 'auto' }}>
          {messages.filter(msg => msg.role === "user" || msg.role === "assistant").map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content || ""}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="message bot" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', maxWidth: 'fit-content' }}>
              <Loader2 className="spinner" size={18} style={{ border: 'none', color: 'var(--accent-color)' }} />
            </div>
          )}
        </div>

        <div className={`controls-area ${isEmptyState ? 'hero-controls' : ''}`}>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            style={{ display: 'none' }} 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                // Future integration for file upload
                console.log("Selected file:", e.target.files[0].name);
                // Can be hooked up to send a message or attach to state
              }
            }} 
          />
          <div className="input-wrapper pill-input">
            <button className="btn-icon attach-btn" onClick={() => fileInputRef.current?.click()}>
              <PlusCircle size={20} />
            </button>
            <input
              type="text"
              className="text-input"
              placeholder="Ask anything..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
              disabled={isProcessing || isRecording}
            />
            
            <button
              className={`btn-icon mic-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
              onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              disabled={isProcessing}
              title="Hold to talk"
            >
              <Mic size={20} />
            </button>

            <button  
              className="btn-icon send-btn" 
              onClick={sendTextMessage}
              disabled={!inputText.trim() || isProcessing || isRecording}
            >
              <Send size={18} style={{ marginLeft: '-2px' }}/>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

