"use client";

import { useState } from "react";
import {
  X, Settings2, Volume2, Thermometer, CreditCard,
  Loader2, Sun, Moon, Info, Trash2, Zap, ShieldAlert
} from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  loggedUser,
  billingLoading,
  handleSubscribe,
  handleManageBilling,
  onClearHistory,
  defaultTab = "general"
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  const set = (key, value) => {
    onConfigChange?.({ ...config, [key]: value });
    if (key === "theme") {
      document.documentElement.setAttribute("data-theme", value);
    }
  };

  // Helper controls
  const renderToggle = (label, checked, onChange) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
          background: checked ? "var(--accent)" : "var(--border)",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: 8, background: "white",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );

  const renderSelect = (label, value, onChange, options) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}>
      <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8,
          background: "var(--input-bg)", border: "1px solid var(--border)",
          color: "var(--text-primary)", fontSize: "0.85rem",
          cursor: "pointer", outline: "none",
        }}
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );

  const renderRange = (label, value, onChange, min, max, step) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value ?? min}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)" }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1100,
      padding: 16
    }}>
      <div style={{
        background: "var(--sidebar-bg)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        maxWidth: "680px",
        width: "100%",
        height: "500px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        color: "var(--text-primary)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)"
        }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={18} />
            <span>Paramètres</span>
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Sidebar tabs layout) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Navigation Sidebar */}
          <div style={{
            width: "200px",
            borderRight: "1px solid var(--border)",
            background: "rgba(0,0,0,0.15)",
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <button
              onClick={() => setActiveTab("general")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                width: "100%",
                textAlign: "left",
                background: activeTab === "general" ? "var(--sidebar-active)" : "transparent",
                color: activeTab === "general" ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <Settings2 size={15} />
              <span>Général</span>
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                width: "100%",
                textAlign: "left",
                background: activeTab === "audio" ? "var(--sidebar-active)" : "transparent",
                color: activeTab === "audio" ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <Volume2 size={15} />
              <span>Audio & Modèle</span>
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                width: "100%",
                textAlign: "left",
                background: activeTab === "billing" ? "var(--sidebar-active)" : "transparent",
                color: activeTab === "billing" ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <CreditCard size={15} />
              <span>Abonnement</span>
            </button>
          </div>

          {/* Content Pane */}
          <div style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* General Tab */}
            {activeTab === "general" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>Paramètres d'interface</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    Personnalisez l'affichage et l'expérience visuelle de l'application.
                  </p>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.85rem" }}>Thème de l'application</span>
                    <button
                      onClick={() => set("theme", config.theme === "dark" ? "light" : "dark")}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8,
                        background: "var(--input-bg)", border: "1px solid var(--border)",
                        color: "var(--text-primary)", fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      {config.theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                      {config.theme === "dark" ? "Clair" : "Sombre"}
                    </button>
                  </div>

                  <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                    {renderToggle("Mode Expert", config.expertMode, v => set("expertMode", v))}
                    {config.expertMode && (
                      <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--accent-muted)", borderRadius: 8, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <Info size={13} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          Affiche les descriptions visuelles de Qwen3-VL et les poids d'attention EARCP dans les réponses.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4, color: "var(--danger)" }}>Actions de discussion</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    Effacez l'historique local ou réinitialisez la session de discussion.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm("Voulez-vous vraiment effacer l'historique de cette discussion ?")) {
                        onClearHistory?.();
                        onClose();
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "var(--danger)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid rgba(239, 68, 68, 0.2)"
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Réinitialiser la discussion</span>
                  </button>
                </div>
              </div>
            )}

            {/* Audio & Model Tab */}
            {activeTab === "audio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Volume2 size={16} />
                    <span>Synthèse vocale (TTS)</span>
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    Activer la lecture audio automatique des réponses de l'assistant.
                  </p>
                  {renderToggle("Lecture audio automatique", config.ttsEnabled, v => set("ttsEnabled", v))}
                  {config.ttsEnabled && (
                    renderSelect("Voix de l'assistant", config.voiceType, v => set("voiceType", v), [
                      { value: "lila",    label: "Lila (Naturelle)" },
                      { value: "ethan",   label: "Ethan (Naturel)" },
                      { value: "female1", label: "Douce (F)" },
                      { value: "male1",   label: "Calme (M)" },
                      { value: "female2", label: "Pro (F)" },
                      { value: "male2",   label: "Pro (M)" },
                    ])
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Thermometer size={16} />
                    <span>Paramètres de génération</span>
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    Ajustez les hyperparamètres du modèle de langage.
                  </p>
                  {renderRange("Température (Créativité)", config.temperature ?? 0.7, v => set("temperature", v), 0.1, 1.5, 0.05)}
                  {renderRange("Jetons max (Longueur réponse)", config.maxTokens ?? 500, v => set("maxTokens", v), 100, 1500, 50)}
                  {renderToggle("Mode streaming (Affichage progressif)", config.streamMode, v => set("streamMode", v))}
                </div>
              </div>
            )}

            {/* Subscription & Pricing Tab */}
            {activeTab === "billing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Votre abonnement actuel</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>
                      {loggedUser?.subscription_status === "active" ? "Hemo Premium 🌟" : "Hemo Standard (Gratuit)"}
                    </div>
                  </div>
                  {loggedUser?.subscription_status === "active" ? (
                    <span style={{
                      fontSize: "0.72rem",
                      background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                      color: "#1e1b4b",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontWeight: 800,
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)"
                    }}>Actif</span>
                  ) : (
                    <span style={{
                      fontSize: "0.72rem",
                      background: "var(--border)",
                      color: "var(--text-secondary)",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontWeight: 600
                    }}>Standard</span>
                  )}
                </div>

                {loggedUser?.subscription_status !== "active" ? (
                  <>
                    <div style={{
                      background: "rgba(139, 92, 246, 0.08)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      borderRadius: 12,
                      padding: 16,
                    }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <Zap size={14} style={{ color: "#a78bfa" }} />
                        <span>Débloquez les fonctionnalités Premium</span>
                      </h4>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 8, padding: 0, margin: 0, listStyle: "none" }}>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span><strong>Vision médicale</strong> : Analysez des images (radiographies, ordonnances, etc.)</span>
                        </li>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span><strong>Interactions vocales</strong> : Whisper ASR pour parler avec l'assistant</span>
                        </li>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span><strong>Analyse de documents PDF</strong> complets</span>
                        </li>
                      </ul>
                    </div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      marginTop: 8
                    }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tarification Premium</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Annulation simple à tout moment</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "white" }}>8.00 $</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>/mois</span>
                      </div>
                    </div>

                    <button
                      onClick={handleSubscribe}
                      disabled={billingLoading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 8
                      }}
                    >
                      {billingLoading ? <Loader2 size={16} className="spinner" /> : "Devenir Premium 🚀"}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: "rgba(16, 163, 127, 0.08)",
                      border: "1px solid rgba(16, 163, 127, 0.2)",
                      borderRadius: 12,
                      padding: 16,
                      fontSize: "0.8rem",
                      lineHeight: 1.5,
                      color: "var(--text-secondary)"
                    }}>
                      Merci pour votre confiance ! Vous disposez actuellement d'un accès illimité à toutes nos fonctionnalités Premium, y compris la vision médicale et la synthèse/transcription vocale Whisper.
                    </div>

                    <button
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--input-bg)",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: "auto"
                      }}
                    >
                      {billingLoading ? <Loader2 size={16} className="spinner" /> : "Gérer la facturation Stripe"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
