"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Good morning! How can I help you today?" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
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
      // Send conversation history (exclude the welcome message) for multi-turn context
      const history = updatedMessages.slice(1, -1).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request." }]);
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        setIsProcessing(true);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append("file", audioBlob, "voice.webm");
        // Send conversation history for multi-turn context
        const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
        formData.append("history", JSON.stringify(history));

        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });
          
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
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your voice." }]);
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

  // Handle both mouse and touch events for the voice button
  const handleVoiceStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent default touch behavior (like scrolling)
    startRecording();
  };

  const handleVoiceEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  return (
    <main className="app-container">
      <header className="header">
        Dr. Melita Assistant
      </header>

      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isProcessing && (
          <div className="message bot" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1', animation: 'pulse 1s infinite' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1', animation: 'pulse 1s infinite 0.2s' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1', animation: 'pulse 1s infinite 0.4s' }}></div>
          </div>
        )}
      </div>

      <div className="controls-area">
        <div className="voice-button-container">
          <button
            className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onMouseLeave={stopRecording}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
            disabled={isProcessing}
            title="Press and hold to talk"
          >
            {isProcessing ? (
              <div className="spinner"></div>
            ) : (
              "🎙️"
            )}
          </button>
          <span className="voice-hint">
            {isProcessing ? "Processing..." : isRecording ? "Recording..." : "Hold to Talk"}
          </span>
        </div>

        <div className="text-input-container">
          <input
            type="text"
            className="text-input"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
            disabled={isProcessing || isRecording}
          />
          <button 
            className="send-button" 
            onClick={sendTextMessage}
            disabled={!inputText.trim() || isProcessing || isRecording}
          >
            ➤
          </button>
        </div>
      </div>
    </main>
  );
}
