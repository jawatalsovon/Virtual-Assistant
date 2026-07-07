"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useSession } from "next-auth/react";
import { Send, Mic, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function WidgetPage() {
  const { status } = useSession();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! How can I help?" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

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
        body: JSON.stringify({ message: text }), // Omitting conversationId for simplicity in widget
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (isProcessing) return;
    try {
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

        try {
          const res = await fetch("/api/voice", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok) {
            setMessages((prev) => [
              ...prev,
              { role: "user", content: `🎙️ ${data.transcript}` },
              { role: "assistant", content: data.reply },
            ]);
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          console.error(error);
          setMessages((prev) => [...prev, { role: "assistant", content: "Voice error." }]);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'transparent' }}>
        <Loader2 className="spinner" size={24} style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--primary-bg)', color: 'var(--text-primary)' }}>
      <header style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid var(--border-color)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        ✨ Assistant
      </header>
      
      <div className="chat-history" ref={chatHistoryRef} style={{ padding: '16px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`} style={{ padding: '10px 14px', fontSize: '0.9rem', maxWidth: '85%' }}>
            {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
          </div>
        ))}
        {isProcessing && (
          <div className="message bot" style={{ padding: '10px 14px', maxWidth: 'fit-content' }}>
            <Loader2 className="spinner" size={14} style={{ border: 'none', color: 'var(--accent-color)' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.9)', borderTop: '1px solid var(--border-color)' }}>
        <div className="input-wrapper" style={{ padding: '4px 8px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Ask..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
            disabled={isProcessing || isRecording}
            style={{ padding: '8px' }}
          />
          <button
            className={`btn-icon ${isRecording ? 'recording' : ''} ${isProcessing ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
            onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
            onMouseLeave={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={isProcessing}
            style={{ width: '32px', height: '32px', marginRight: '4px' }}
          >
            <Mic size={16} />
          </button>
          <button 
            className="btn-icon send-btn" 
            onClick={sendTextMessage}
            disabled={!inputText.trim() || isProcessing || isRecording}
            style={{ width: '32px', height: '32px' }}
          >
            <Send size={14} style={{ marginLeft: '-2px' }}/>
          </button>
        </div>
      </div>
    </div>
  );
}
