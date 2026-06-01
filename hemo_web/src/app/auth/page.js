"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, ArrowRight, Loader2, Key } from "lucide-react";
import DrHemoAvatar from "@/components/DrHemoAvatar";

export default function AuthPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState("login"); // "login", "signup", "forgot", "reset"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    resetCode: "",
    newPassword: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    let endpoint = "";
    let payload = {};

    if (authState === "login") {
      endpoint = "/api/auth/login";
      payload = { username: formData.username, password: formData.password };
    } else if (authState === "signup") {
      endpoint = "/api/auth/signup";
      payload = { username: formData.username, email: formData.email, password: formData.password };
    } else if (authState === "forgot") {
      endpoint = "/api/auth/reset-request";
      payload = { email: formData.email };
    } else if (authState === "reset") {
      endpoint = "/api/auth/reset-password";
      payload = { username: formData.username, resetCode: formData.resetCode, newPassword: formData.newPassword };
    }
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || "An error occurred");
      }

      if (authState === "forgot") {
        setFormData(prev => ({ ...prev, username: data.username }));
        alert(`A recovery code has been generated. For testing/demo purposes, the code is: ${data.resetCode}`);
        setAuthState("reset");
      } else if (authState === "reset") {
        alert("Password updated successfully! Please log in.");
        setAuthState("login");
      } else {
        localStorage.setItem("hemo_user", JSON.stringify({
          username: data.username,
          token: data.token,
          subscription_status: data.subscription_status || "inactive"
        }));
        router.push("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (authState) {
      case "signup": return "Create an account";
      case "forgot": return "Reset password";
      case "reset":  return "Set new password";
      default:       return "Welcome back!";
    }
  };

  const getDescription = () => {
    switch (authState) {
      case "signup": return "Join Hemo for personalized health tracking.";
      case "forgot": return "Enter your email to receive a recovery code.";
      case "reset":  return "Enter the recovery code and your new password.";
      default:       return "Log in to reconnect with Hemo.";
    }
  };

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="auth-card" style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--sidebar-bg)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <DrHemoAvatar size={80} state={isLoading ? "thinking" : "idle"} />
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {getTitle()}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>
          {getDescription()}
        </p>

        {error && (
          <div style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '12px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {authState === "signup" && (
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {authState === "forgot" && (
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {(authState === "login" || authState === "signup") && (
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {authState === "login" && (
            <div className="input-group" style={{ marginBottom: '4px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {authState === "login" && (
            <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setAuthState("forgot")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {authState === "signup" && (
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {authState === "reset" && (
            <>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Recovery Code"
                    required
                    value={formData.resetCode}
                    onChange={(e) => setFormData({...formData, resetCode: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: '12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="New Password"
                    required
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: '12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? <Loader2 size={20} className="spinner" /> : (
              <>
                {authState === "login" && "Login"}
                {authState === "signup" && "Sign Up"}
                {authState === "forgot" && "Send Recovery Code"}
                {authState === "reset" && "Reset Password"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setError("");
            if (authState === "login") setAuthState("signup");
            else setAuthState("login");
          }}
          style={{
            marginTop: '24px',
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          {authState === "login" && "Don't have an account? Sign Up"}
          {authState === "signup" && "Already have an account? Login"}
          {(authState === "forgot" || authState === "reset") && "Back to Login"}
        </button>
      </div>
    </div>
  );
}
