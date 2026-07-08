"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowLeft, Send, Volume2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  
  // Telegram State
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramStatus, setTelegramStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Voice State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState(1);

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    
    // Some browsers need this event
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    // Load preferences
    const savedVoice = localStorage.getItem("nova_voice_uri");
    if (savedVoice) setSelectedVoiceURI(savedVoice);
    
    const savedSpeed = localStorage.getItem("nova_voice_speed");
    if (savedSpeed) setVoiceSpeed(parseFloat(savedSpeed));
  }, []);

  const handleSaveTelegram = async () => {
    if (!telegramChatId.trim()) return;
    setTelegramStatus("loading");

    try {
      const res = await fetch("/api/telegram-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: telegramChatId.trim() }),
      });

      if (res.ok) {
        setTelegramStatus("success");
        setTimeout(() => setTelegramStatus("idle"), 3000);
      } else {
        setTelegramStatus("error");
      }
    } catch (e) {
      setTelegramStatus("error");
    }
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    localStorage.setItem("nova_voice_uri", uri);
    
    // Demo the voice
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("This is my new voice.");
      const voice = voices.find(v => v.voiceURI === uri);
      if (voice) utterance.voice = voice;
      utterance.rate = voiceSpeed;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    setVoiceSpeed(speed);
    localStorage.setItem("nova_voice_speed", speed.toString());
  };

  return (
    <div className="app-container" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px" }}>
      
      <div className="chat-header glass-panel" style={{ display: "flex", alignItems: "center", padding: "16px", borderRadius: "16px", gap: "12px" }}>
        <button onClick={() => router.push("/")} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-color)" }}>
          <ArrowLeft size={24} />
        </button>
        <Settings size={24} style={{ color: "var(--accent-color)" }} />
        <h1 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Nova Settings</h1>
      </div>

      <div className="glass-panel" style={{ padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Telegram Linking */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Send size={20} />
            Link Telegram Account
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Enter your Telegram Chat ID so you can talk to Nova on the go via Telegram.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text" 
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 123456789"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "rgba(255,255,255,0.7)",
                fontSize: "1rem"
              }}
            />
            <button 
              onClick={handleSaveTelegram}
              disabled={telegramStatus === "loading"}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "var(--accent-color)",
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {telegramStatus === "loading" ? "Saving..." : "Link"}
            </button>
          </div>
          {telegramStatus === "success" && <p style={{ color: "green", fontSize: "0.9rem", margin: 0 }}>Successfully linked!</p>}
          {telegramStatus === "error" && <p style={{ color: "red", fontSize: "0.9rem", margin: 0 }}>Failed to link. Please try again.</p>}
        </section>

        <hr style={{ borderTop: "1px solid var(--border-color)", borderBottom: "none" }} />

        {/* Voice Settings */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Volume2 size={20} />
            Voice Settings
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Choose the voice and speed for Nova. The options below are provided by your current browser and operating system.
          </p>
          
          <label style={{ fontSize: "0.95rem", fontWeight: "500", marginTop: "8px" }}>Voice</label>
          <select 
            value={selectedVoiceURI} 
            onChange={handleVoiceChange}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "rgba(255,255,255,0.7)",
              fontSize: "1rem"
            }}
          >
            <option value="">Default (Auto-select female voice)</option>
            {voices.map(v => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>

          <label style={{ fontSize: "0.95rem", fontWeight: "500", marginTop: "12px" }}>
            Speech Speed: {voiceSpeed.toFixed(1)}x
          </label>
          <input 
            type="range" 
            min="0.5" max="2.0" step="0.1" 
            value={voiceSpeed}
            onChange={handleSpeedChange}
            style={{ width: "100%", accentColor: "var(--accent-color)" }}
          />
        </section>

      </div>
    </div>
  );
}
