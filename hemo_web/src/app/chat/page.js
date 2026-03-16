"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Mic, RotateCcw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const API_BASE = "http://127.0.0.1:8000";

function formatMessage(text) {
  // Simple markdown-like rendering
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis **Dr. Hemo**, votre assistant médical spécialisé en drépanocytose. Comment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initDone = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-send a suggested question from home page
  useEffect(() => {
    if (initDone.current) return;
    const q = searchParams.get("q");
    if (q) {
      initDone.current = true;
      sendMessage(q);
    }
  }, [searchParams]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    if (!overrideText) setInput("");

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const newHistory = [...history, { role: "user", content: text }];

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: newHistory.slice(-10) }),
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      const aiMsg = { role: "assistant", content: data.response };
      setMessages((prev) => [...prev, aiMsg]);
      setHistory([...newHistory, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Désolé, je rencontre des difficultés de connexion. Vérifiez que le backend est démarré sur le port 8000.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Bonjour ! Je suis **Dr. Hemo**. Comment puis-je vous aider ?",
      },
    ]);
    setHistory([]);
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #10a37f, #0a7c61)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            🩸
          </div>
          <h1>Dr. Hemo — Chat</h1>
          <span
            className="status-badge"
            style={{ color: isLoading ? "var(--warning)" : "var(--accent)" }}
          >
            {isLoading ? "⟳ Réflexion..." : "● En ligne"}
          </span>

          <button
            onClick={clearChat}
            title="Nouvelle conversation"
            style={{
              marginLeft: "8px",
              padding: "6px 8px",
              borderRadius: "8px",
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--sidebar-hover)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          >
            <RotateCcw size={14} />
            Nouveau
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className={`msg-avatar ${msg.role === "assistant" ? "ai-avatar" : "user-avatar"}`}>
                {msg.role === "assistant" ? "🩸" : "U"}
              </div>
              <div className="message-bubble">
                {msg.role === "assistant" && (
                  <div className="message-name">Dr. Hemo</div>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-row ai">
              <div className="msg-avatar ai-avatar">🩸</div>
              <div className="message-bubble">
                <div className="message-name">Dr. Hemo</div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Posez votre question à Dr. Hemo..."
              disabled={isLoading}
            />
            <button
              className="input-btn icon-btn"
              onClick={() => router.push("/voice")}
              title="Interaction vocale"
            >
              <Mic size={16} />
            </button>
            <button
              className="input-btn send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              title="Envoyer"
            >
              {isLoading ? (
                <div className="spinner" />
              ) : (
                <Send size={15} style={{ marginLeft: "1px" }} />
              )}
            </button>
          </div>
          <p className="input-hint">
            Dr. Hemo peut faire des erreurs. Consultez toujours un professionnel de santé.
          </p>
        </div>
      </main>
    </div>
  );
}
