"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await GoogleSignIn.signIn();
        const { serverAuthCode, idToken } = result;
        
        if (serverAuthCode && idToken) {
          const res = await signIn("mobile-google", {
            serverAuthCode,
            idToken,
            redirect: false,
          });
          
          if (res?.ok) {
            window.location.href = "/";
          } else {
            console.error("Native login failed:", res?.error);
            setErrorMsg("Authentication failed: " + (res?.error || "Unknown error"));
          }
        } else {
          setErrorMsg("Failed to get credentials from Google.");
        }
      } catch (err: any) {
        console.error("Capacitor Google Sign-In Error:", err);
        setErrorMsg(err.message || "An unexpected error occurred during sign in.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Standard Web Flow
      signIn("google", { callbackUrl: "/" });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-avatar">
            <span>✨</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to access your personal assistant</p>
        </div>
        
        {errorMsg && (
          <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {errorMsg}
          </div>
        )}
        
        <button 
          className="btn-primary" 
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="spinner" size={20} /> : <LogIn size={20} />}
          <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
        </button>
      </div>
    </div>
  );
}
