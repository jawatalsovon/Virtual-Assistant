"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Mic, LogOut, MessageSquare, PlusCircle, User, Loader2, Menu, X, Settings } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEmptyState = messages.length <= 1;
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auth Protection
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchConversations();
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
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-primary" onClick={() => { startNewConversation(); setIsMobileMenuOpen(false); }} style={{ flexGrow: 1, marginRight: isMobileMenuOpen ? '10px' : '0' }}>
            <PlusCircle size={18} />
            <span>New Chat</span>
          </button>
          {isMobileMenuOpen && (
            <button className="btn-icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>
        <ul className="conv-list">
          {conversations.map(conv => (
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
            <button className="btn-icon" onClick={() => signOut()} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="main-chat">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn-icon mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <h1>Nova</h1>
            </div>
            <button className="btn-icon" onClick={() => router.push("/settings")} title="Settings">
              <Settings size={20} />
            </button>
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

