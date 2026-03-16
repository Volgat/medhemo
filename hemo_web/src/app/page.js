"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Mic, MicOff, Paperclip, RotateCcw, X, Zap, MessageCircle, Heart
} from "lucide-react";
import Sidebar, { DEFAULT_CONFIG } from "@/components/Sidebar";
import DrHemoAvatar from "@/components/DrHemoAvatar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

export default function UnifiedPage() {
  const [messages, setMessages]   = useState([
    { role: "assistant", content: "Bonjour ! Je suis **Hemo**, votre assistant médical intelligent. Je suis là pour vous aider avec vos questions de santé, vos analyses médicales ou même pour suivre votre bien-être au quotidien. Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [history, setHistory]       = useState([]);      // API history (role/content pairs)
  const [msgHistory, setMsgHistory] = useState([]);      // UI entries for sidebar
  const [loggedUser, setLoggedUser] = useState(null);

  // Sidebar config (temperature, max tokens, TTS lang, streaming, lang, expert mode)
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Image
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Audio
  const [isRecording, setIsRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Conversation mode
  const [convMode, setConvMode]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const fileInputRef   = useRef(null);
  const audioRef       = useRef(null);
  const mediaRecRef    = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef       = useRef(null);
  const convLoopRef    = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("hemo_user");
    if (saved) setLoggedUser(JSON.parse(saved));
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const playTTS = useCallback(async (text) => {
    if (!config.ttsEnabled || !text) return;
    try {
      setIsSpeaking(true);
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: [] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.audio_b64) {
        const bytes = Uint8Array.from(atob(data.audio_b64), c => c.charCodeAt(0));
        const url   = URL.createObjectURL(new Blob([bytes], { type: "audio/mp3" }));
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          if (convLoopRef.current) setTimeout(() => startRecording(true), 600);
        };
        await audioRef.current.play();
      } else {
        setIsSpeaking(false);
      }
    } catch { setIsSpeaking(false); }
  }, [config.ttsEnabled]);

  // ── Core send ────────────────────────────────────────────────────────────────
  const sendMultimodal = async ({ text, audioBlob, image } = {}) => {
    const msg = (text ?? input).trim();
    if (!msg && !audioBlob && !image && !imageFile) return;
    if (isLoading) return;

    // Optimistic message
    if (!audioBlob) {
      const content = msg || "Analyse cette image médicale.";
      const userMsg = { role: "user", content, preview: imagePreview };
      setMessages(p => [...p, userMsg]);
      setMsgHistory(p => [...p, userMsg]);
    }
    if (!audioBlob) setInput("");
    setIsLoading(true);

    const form = new FormData();
    form.append("text", msg);
    form.append("history_json", JSON.stringify(history.slice(-10)));
    form.append("tts", config.ttsEnabled.toString());
    if (audioBlob) form.append("audio", audioBlob, "voice.webm");
    const img = image ?? imageFile;
    if (img) form.append("image", img);

    try {
      const res  = await fetch(`${API_BASE}/api/multimodal`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data = await res.json();

      // Show transcription bubble for voice input
      if (data.transcription) {
        const transcMsg = { role: "user", content: data.transcription, isTranscription: true };
        setMessages(p => [...p, transcMsg]);
        setMsgHistory(p => [...p, transcMsg]);
      }

      const aiMsg = {
        role: "assistant",
        content: data.response,
        visualDescription: config.expertMode ? data.visual_description : null,
        earcp: config.expertMode ? data.earcp_weights : null,
      };
      setMessages(p => [...p, aiMsg]);
      setHistory(data.history || []);

      await playTTS(data.response);
    } catch (err) {
      setMessages(p => [...p, {
        role: "assistant",
        content: `⚠️ Erreur de connexion (${err.message}). Vérifiez que le backend tourne sur le port 8000.`,
      }]);
    } finally {
      setIsLoading(false);
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Image picker ─────────────────────────────────────────────────────────────
  const pickImage = (file) => {
    if (!file?.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── Recording ────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async (isLoop = false) => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await sendMultimodal({ audioBlob: new Blob(audioChunksRef.current, { type: "audio/webm" }) });
      };
      mr.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch { alert("Accès au microphone refusé."); }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRecRef.current?.stop();
    setIsRecording(false);
    setRecordSeconds(0);
  }, []);

  // ── Conversation toggle ───────────────────────────────────────────────────────
  const toggleConvMode = async () => {
    if (convLoopRef.current) {
      convLoopRef.current = false;
      setConvMode(false);
      stopRecording();
      if (audioRef.current) { audioRef.current.pause(); setIsSpeaking(false); }
    } else {
      convLoopRef.current = true;
      setConvMode(true);
      await startRecording(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hemo_user");
    setLoggedUser(null);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" }]);
    setHistory([]);
    setMsgHistory([]);
  };

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel = isLoading
    ? "⟳ Traitement..."
    : isSpeaking  ? "🔊 Parole..."
    : convMode    ? (isRecording ? "⏺ Écoute..." : "🗣️ Conversation")
    : isRecording ? "⏺ Enregistrement"
    : "● En ligne";

  const statusColor = isLoading ? "var(--warning)"
    : isSpeaking             ? "#a78bfa"
    : (isRecording || convMode) ? "var(--danger)"
    : "var(--accent)";

  return (
    <div className="app-shell">
      <Sidebar
        config={config}
        onConfigChange={setConfig}
        history={msgHistory}
        onClearHistory={clearChat}
      />
      <audio ref={audioRef} style={{ display: "none" }} />

      <main className="main-content">
        {/* ── Header ── */}
        <div className="page-header">
          <DrHemoAvatar 
            size={40} 
            isSpeaking={isSpeaking} 
            state={isLoading ? "thinking" : isRecording ? "listening" : "idle"}
          />
          <h1 style={{ marginLeft: 8 }}>Hemo</h1>
          <span className="status-badge" style={{ color: statusColor }}>{statusLabel}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: 'center' }}>
            {loggedUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span>{loggedUser.username}</span>
                <button onClick={handleLogout} style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>Déconnexion</button>
              </div>
            ) : (
              <button 
                onClick={() => router.push("/auth")}
                style={{ 
                  background: 'var(--accent)', 
                  color: 'white', 
                  padding: '6px 16px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                S'identifier
              </button>
            )}
            <button className="icon-action-btn" onClick={clearChat} title="Nouvelle conversation">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role === "assistant" ? "ai" : "user"}`}>
              <div className={`msg-avatar ${msg.role === "assistant" ? "ai-avatar" : "user-avatar"}`}>
                {msg.role === "assistant" ? (
                  <DrHemoAvatar 
                    size={24} 
                    isSpeaking={isSpeaking && i === messages.length - 1} 
                    state={isLoading && i === messages.length - 1 ? "thinking" : "idle"}
                  />
                ) : msg.isTranscription ? "🎙️" : "U"}
              </div>
              <div className="message-bubble">
                {msg.role === "assistant" && <div className="message-name">Hemo</div>}
                {msg.isTranscription && (
                  <div className="message-name" style={{ color: "var(--warning)" }}>🎙️ Transcription Whisper</div>
                )}
                {msg.preview && (
                  <img src={msg.preview} alt="Uploaded" style={{ maxWidth: 200, borderRadius: 8, marginBottom: 6, display: "block" }} />
                )}
                {/* Expert mode: LLaVA visual description */}
                {msg.visualDescription && config.expertMode && (
                  <details style={{ marginBottom: 6 }}>
                    <summary style={{ fontSize: "0.72rem", cursor: "pointer", color: "var(--text-muted)" }}>
                      🔍 Description visuelle LLaVA
                    </summary>
                    <p style={{ fontSize: "0.78rem", lineHeight: 1.6, marginTop: 4, color: "var(--text-secondary)" }}>
                      {msg.visualDescription}
                    </p>
                  </details>
                )}
                {/* Expert mode: EARCP weights */}
                {msg.earcp && config.expertMode && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    {Object.entries(msg.earcp).map(([k, v]) => (
                      <span key={k} style={{ fontSize: "0.65rem", background: "var(--accent-muted)", color: "var(--accent)", padding: "1px 6px", borderRadius: 8 }}>
                        {k.replace("Expert", "")} {Math.round(v * 100)}%
                      </span>
                    ))}
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-row ai">
              <div className="msg-avatar ai-avatar">
                <DrHemoAvatar size={24} state="thinking" />
              </div>
              <div className="message-bubble">
                <div className="message-name">Hemo</div>
                <div className="typing-indicator">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ── */}
        <div className="input-area">
          {imageFile && (
            <div className="attachment-preview">
              <img src={imagePreview} alt="attachment" />
              <span title={imageFile.name}>{imageFile.name}</span>
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X size={12} />
              </button>
            </div>
          )}

          {isRecording && (
            <div className="recording-bar">
              <span className="rec-dot" />
              <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>{fmtTime(recordSeconds)}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", flex: 1 }}>
                {convMode ? "Conversation — parlez..." : "Enregistrement... cliquez ⏹ pour envoyer"}
              </span>
            </div>
          )}

          <div className="input-wrapper">
            <button className="input-icon-btn" title="Joindre une image" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <Paperclip size={17} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickImage(e.target.files[0])} />

            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMultimodal()}
              onPaste={e => {
                const item = [...e.clipboardData.items].find(i => i.type.startsWith("image/"));
                if (item) { e.preventDefault(); pickImage(item.getAsFile()); }
              }}
              placeholder={convMode ? "Mode conversation actif..." : "Posez votre question à Hemo..."}
              disabled={isLoading || convMode}
            />

            {/* Single-shot mic */}
            <button
              className={`input-icon-btn ${isRecording && !convMode ? "recording" : ""}`}
              title={isRecording && !convMode ? "Arrêter et envoyer" : "Dicter un message"}
              onClick={() => isRecording && !convMode ? stopRecording() : startRecording(false)}
              disabled={isLoading || isSpeaking || convMode}
            >
              {isRecording && !convMode ? <MicOff size={17} /> : <Mic size={17} />}
            </button>

            {/* Continuous conversation toggle */}
            <button
              className={`input-icon-btn ${convMode ? "conv-active" : ""}`}
              title={convMode ? "Arrêter la conversation" : "Mode conversation continue"}
              onClick={toggleConvMode}
              disabled={isLoading && !convMode}
            >
              <MessageCircle size={17} />
            </button>

            <button
              className="input-btn send"
              onClick={() => sendMultimodal()}
              disabled={(!input.trim() && !imageFile) || isLoading || convMode}
            >
              {isLoading ? <div className="spinner" /> : <Send size={15} style={{ marginLeft: 1 }} />}
            </button>
          </div>

          <p className="input-hint">
            <Zap size={10} style={{ display: "inline", marginRight: 3, color: "var(--accent)" }} />
            Orchestré par EARCP · Assistance médicale universelle · Collez une image directement
          </p>
        </div>
      </main>
    </div>
  );
}
