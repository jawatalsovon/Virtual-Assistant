"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    
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
            alert("Login failed: " + res?.error);
          }
        }
      } catch (err) {
        console.error("Capacitor Google Sign-In Error:", err);
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
