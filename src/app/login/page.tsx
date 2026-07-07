"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function LoginPage() {
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
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <LogIn size={20} />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
