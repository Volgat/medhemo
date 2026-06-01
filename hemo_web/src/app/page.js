"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Mic, MicOff, Paperclip, RotateCcw, X, Zap, MessageCircle, Heart,
  PanelLeftClose, PanelLeftOpen, User
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import DrHemoAvatar from "@/components/DrHemoAvatar";
import LandingPage from "@/components/LandingPage";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const TRANSLATIONS = {
  fr: {
    welcome: "Bonjour ! Je suis **Hemo**, votre assistant santé personnel. Comment puis-je vous aider aujourd'hui ?",
    resetMsg: "Conversation réinitialisée. Comment puis-je vous aider ?",
    processing: "Traitement...",
    speaking: "Parle...",
    listening: "Écoute...",
    conversation: "Conversation",
    recording: "Enregistrement",
    online: "En ligne",
    hideSidebar: "Masquer la barre",
    showSidebar: "Afficher la barre",
    newChat: "Nouvelle conversation",
    hemoListening: "Hemo vous écoute...",
    hemoAnalyzing: "Hemo analyse...",
    hemoResponding: "Hemo répond...",
    readyToSpeak: "Prêt à parler",
    stop: "Arrêter",
    close: "Fermer",
    placeholderConv: "Mode conversation actif...",
    placeholderAsk: "Posez une question à Hemo...",
    hint: "MedHemo AI · Conseils de santé personnalisés · Collez une image directement",
    backHome: "Retour à l'accueil",
    whisperTranscription: "Transcription vocale",
    visualDescription: "Description visuelle détaillée"
  },
  en: {
    welcome: "Hello! I am **Hemo**, your personal health assistant. How can I help you today?",
    resetMsg: "Conversation reset. How can I help you?",
    processing: "Processing...",
    speaking: "Speaking...",
    listening: "Listening...",
    conversation: "Conversation",
    recording: "Recording",
    online: "Online",
    hideSidebar: "Hide sidebar",
    showSidebar: "Show sidebar",
    newChat: "New conversation",
    hemoListening: "Hemo is listening...",
    hemoAnalyzing: "Hemo is analyzing...",
    hemoResponding: "Hemo is responding...",
    readyToSpeak: "Ready to speak",
    stop: "Stop",
    close: "Close",
    placeholderConv: "Conversation mode active...",
    placeholderAsk: "Ask Hemo a question...",
    hint: "MedHemo AI · Personalized Health Insights · Paste an image directly",
    backHome: "Back to Home",
    whisperTranscription: "Voice transcription",
    visualDescription: "Detailed visual description"
  },
  es: {
    welcome: "¡Hola! Soy **Hemo**, su asistente de salud personal. ¿Cómo puedo ayudarle hoy?",
    resetMsg: "Conversación restablecida. ¿Cómo puedo ayudarle?",
    processing: "Procesando...",
    speaking: "Hablando...",
    listening: "Escuchando...",
    conversation: "Conversación",
    recording: "Grabación",
    online: "En línea",
    hideSidebar: "Ocultar barra",
    showSidebar: "Mostrar barra",
    newChat: "Nueva conversación",
    hemoListening: "Hemo está escuchando...",
    hemoAnalyzing: "Hemo está analizando...",
    hemoResponding: "Hemo está respondiendo...",
    readyToSpeak: "Listo para hablar",
    stop: "Detener",
    close: "Cerrar",
    placeholderConv: "Modo de conversación activo...",
    placeholderAsk: "Haga una pregunta a Hemo...",
    hint: "MedHemo AI · Consejos de salud personalizados · Pegue una imagen directamente",
    backHome: "Volver al inicio",
    whisperTranscription: "Transcripción de voz",
    visualDescription: "Descripción visual detallada"
  }
};

const DEFAULT_CONFIG = {
  ttsEnabled:    true,
  voiceType:     "lila",
  theme:         "dark",
  language:      "en",
  temperature:   0.7,
  maxTokens:     500,
  streamMode:    true,
  expertMode:    false,
};

function formatMessage(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

export default function UnifiedPage() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(true);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [history, setHistory]       = useState([]);      // API history (role/content pairs)
  const [msgHistory, setMsgHistory] = useState([]);      // UI entries for sidebar
  const [loggedUser, setLoggedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState("general");

  const handleSubscribe = async () => {
    if (!loggedUser) return;
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loggedUser.username }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Error redirecting to Stripe payment page. Please try again later.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!loggedUser) return;
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loggedUser.username }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Error redirecting to Stripe billing portal. Please try again later.");
    } finally {
      setBillingLoading(false);
    }
  };

  const triggerUpgrade = () => {
    setSettingsModalTab("billing");
    setShowSettingsModal(true);
  };

  // Sidebar config (temperature, max tokens, TTS lang, streaming, lang, expert mode)
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem("hemo_config");
    if (saved) {
      try {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error("Error loading config from localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("hemo_config", JSON.stringify(config));
    if (config.theme) {
      document.documentElement.setAttribute("data-theme", config.theme);
    }
  }, [config]);

  const lang = config.language || "en";
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"][key];

  // Image
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Audio
  const [isRecording, setIsRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Conversation mode
  const [convMode, setConvMode]       = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

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
    const fetchStatus = async (user) => {
      try {
        const res = await fetch(`/api/auth/status?username=${user.username}`);
        if (res.ok) {
          const data = await res.json();
          const updated = { ...user, subscription_status: data.subscription_status };
          localStorage.setItem("hemo_user", JSON.stringify(updated));
          setLoggedUser(updated);
        }
      } catch (e) {
        console.error("Error fetching user status:", e);
      }
    };

    const saved = localStorage.getItem("hemo_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      setLoggedUser(parsed);
      fetchStatus(parsed);
      // Only auto-hide landing if not explicitly requested
      const params = new URLSearchParams(window.location.search);
      if (params.get('landing') !== 'true') {
        setShowLanding(false);
      }
    } else {
      setShowLanding(true);
    }
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const playTTS = useCallback(async (text) => {
    if (!config.ttsEnabled || !text) return;
    try {
      setIsSpeaking(true);
      const res = await fetch(`/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: [], voice_type: config.voiceType }),
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
          if (convLoopRef.current || isVoiceMode) {
            setTimeout(() => startRecording(true), 600);
          }
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
    form.append("voice_type", config.voiceType);
    if (audioBlob) form.append("audio", audioBlob, "voice.webm");
    const img = image ?? imageFile;
    if (img) form.append("image", img);
    if (loggedUser) form.append("username", loggedUser.username);

    try {
      const res  = await fetch(`/api/hemo`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);

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
        content: "I am sorry, an error occurred. Please try again shortly.",
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
    } catch { alert("Microphone access denied."); }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRecRef.current?.stop();
    setIsRecording(false);
    setRecordSeconds(0);
    // Explicitly do NOT close Voice Mode overlay here if it's meant to be continuous
    // The user will close it via the "Fermer" button.
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
    setMessages([]);
    setHistory([]);
    setMsgHistory([]);
  };

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel = isLoading
    ? t("processing")
    : isSpeaking  ? t("speaking")
    : convMode    ? (isRecording ? t("listening") : t("conversation"))
    : isRecording ? t("recording")
    : t("online");

  const statusColor = isLoading ? "var(--warning)"
    : isSpeaking             ? "#a78bfa"
    : (isRecording || convMode) ? "var(--danger)"
    : "var(--accent)";

  return (
    <div className="app-shell">
      {loggedUser && (
        <Sidebar
          isOpen={isSidebarOpen}
          config={config}
          history={msgHistory}
          onClearHistory={clearChat}
          onLogout={handleLogout}
          loggedUser={loggedUser}
          onLogoClick={() => setShowLanding(true)}
          onSettingsClick={() => {
            setSettingsModalTab("general");
            setShowSettingsModal(true);
          }}
        />
      )}
      <audio ref={audioRef} style={{ display: "none" }} />

      <main className="main-content">
        {(!loggedUser || showLanding) ? (
          <LandingPage 
            config={config}
            onLogin={() => router.push("/auth")} 
            onSignup={() => router.push("/auth")}
            onClose={() => setShowLanding(false)}
          />
        ) : (
          <>
            {/* ── Header ── */}
            <div className="page-header">
              {loggedUser && (
                <button 
                  className="icon-action-btn" 
                  onClick={() => setIsSidebarOpen(prev => !prev)} 
                  title={isSidebarOpen ? t("hideSidebar") : t("showSidebar")}
                  style={{ marginRight: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
              )}
              <div 
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowLanding(true)}
              >
                <DrHemoAvatar 
                  size={40} 
                  isSpeaking={isSpeaking} 
                  state={isLoading ? "thinking" : isRecording ? "listening" : "idle"}
                />
                <h1 style={{ marginLeft: 8 }}>Hemo</h1>
              </div>
              <span className="status-badge" style={{ color: statusColor }}>{statusLabel}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: 'center' }}>
                {loggedUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span>{loggedUser.username}</span>
                  </div>
                )}
                <button className="icon-action-btn" onClick={clearChat} title={t("newChat")}>
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* ── Voice Mode Overlay ── */}
            {isVoiceMode && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', color: 'white'
              }}>
                <div style={{ marginBottom: 40, transform: 'scale(2)' }}>
                  <DrHemoAvatar 
                    size={100} 
                    isSpeaking={isSpeaking} 
                    state={isLoading ? "thinking" : isRecording ? "listening" : "idle"}
                  />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 10 }}>
                  {isRecording ? t("hemoListening") : isLoading ? t("hemoAnalyzing") : isSpeaking ? t("hemoResponding") : t("readyToSpeak")}
                </h2>
                {isRecording && <div style={{ fontSize: '1.2rem', color: 'var(--danger)' }}>{fmtTime(recordSeconds)}</div>}
                <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
                  {isRecording ? (
                    <button 
                      onClick={stopRecording}
                      style={{ padding: '15px 30px', borderRadius: 30, background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {t("stop")}
                    </button>
                  ) : !isLoading && !isSpeaking && (
                    <button 
                      onClick={() => setIsVoiceMode(false)}
                      style={{ padding: '15px 30px', borderRadius: 30, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Fermer
                    </button>
                  )}
                </div>
              </div>
            )}


            {/* ── Settings Modal ── */}
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              config={config}
              onConfigChange={setConfig}
              loggedUser={loggedUser}
              billingLoading={billingLoading}
              handleSubscribe={handleSubscribe}
              handleManageBilling={handleManageBilling}
              onClearHistory={clearChat}
              defaultTab={settingsModalTab}
            />
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
                        ) : msg.isTranscription ? (
                          <Mic size={14} />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                      <div className="message-bubble">
                        {msg.role === "assistant" && <div className="message-name">Hemo</div>}
                        {msg.isTranscription && (
                          <div className="message-name" style={{ color: "var(--warning)" }}>{t("whisperTranscription")}</div>
                        )}
                        {msg.preview && (
                          <img src={msg.preview} alt="Uploaded" style={{ maxWidth: 200, borderRadius: 8, marginBottom: 6, display: "block" }} />
                        )}
                        {/* Expert mode: visual description */}
                        {msg.visualDescription && config.expertMode && (
                          <details style={{ marginBottom: 6 }}>
                            <summary style={{ fontSize: "0.72rem", cursor: "pointer", color: "var(--text-muted)" }}>
                              {t("visualDescription")}
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
                        <div dangerouslySetInnerHTML={{
                          __html: formatMessage(
                            msg.content === "Bonjour ! Je suis **Hemo**, votre assistant santé personnel. Comment puis-je vous aider aujourd'hui ?"
                              ? t("welcome")
                              : msg.content
                          )
                        }} />
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
                        {convMode ? "Conversation — speak now..." : "Recording... click Stop to send"}
                      </span>
                    </div>
                  )}

                  <div className="input-wrapper">
                    <button
                      className="input-icon-btn"
                      title="Attach an image"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      <Paperclip size={17} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={e => pickImage(e.target.files[0])}
                    />

                    <input
                      ref={inputRef}
                      className="chat-input"
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMultimodal()}
                      onPaste={e => {
                        const item = [...e.clipboardData.items].find(i => i.type.startsWith("image/"));
                        if (item) {
                          e.preventDefault();
                          pickImage(item.getAsFile());
                        }
                      }}
                      placeholder={convMode ? t("placeholderConv") : t("placeholderAsk")}
                      disabled={isLoading || convMode}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className={`input-icon-btn ${isRecording && !convMode ? "recording" : ""}`}
                        title={isRecording && !convMode ? "Stop and send" : "Interaction Vocale"}
                        onClick={() => {
                          if (isRecording && !convMode) {
                            stopRecording();
                          } else {
                            setIsVoiceMode(true);
                            startRecording(false);
                          }
                        }}
                        disabled={isLoading || isSpeaking || convMode}
                      >
                        {isRecording && !convMode ? <MicOff size={17} /> : <Mic size={17} />}
                      </button>

                      <button
                        className={`input-icon-btn ${convMode ? "conv-active" : ""}`}
                        title={convMode ? "Stop conversation" : "Continuous conversation mode"}
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

                  </div>

                  <p className="input-hint">
                    <Zap size={10} style={{ display: "inline", marginRight: 3, color: "var(--accent)" }} />
                    {t("hint")}
                    {loggedUser && <span style={{ cursor: 'pointer', color: 'var(--accent)', marginLeft: 8 }} onClick={() => setShowLanding(true)}>{t("backHome")}</span>}
                  </p>
                </div>
              </>
            )}
      </main>
    </div>
  );
}
