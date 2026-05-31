"use client";

import { useState } from "react";
import {
  X, Settings2, Volume2, Thermometer, CreditCard,
  Loader2, Info, Trash2, Zap
} from "lucide-react";

const TRANSLATIONS = {
  fr: {
    settings: "Paramètres",
    general: "Général",
    audioModel: "Audio & Modèle",
    subscription: "Abonnement",
    interfaceSettings: "Paramètres d'interface",
    interfaceSettingsDesc: "Personnalisez l'affichage et l'expérience visuelle de l'application.",
    appTheme: "Thème de l'application",
    themeLight: "Mode Clair",
    themeDark: "Mode Sombre",
    appLanguage: "Langue de l'interface",
    langFr: "Français",
    langEn: "English",
    expertMode: "Mode Expert",
    expertModeDesc: "Affiche les descriptions visuelles détaillées et les poids d'analyse technique dans les réponses.",
    discussionActions: "Actions de discussion",
    discussionActionsDesc: "Effacez l'historique local ou réinitialisez la session de discussion.",
    resetDiscussion: "Réinitialiser la discussion",
    resetConfirm: "Voulez-vous vraiment effacer l'historique de cette discussion ?",
    ttsTitle: "Synthèse vocale TTS",
    ttsDesc: "Activer la lecture audio automatique des réponses de l'assistant.",
    ttsAuto: "Lecture audio automatique",
    assistantVoice: "Voix de l'assistant",
    voiceLila: "Lila Naturelle",
    voiceEthan: "Ethan Naturel",
    voiceFemale1: "Douce F",
    voiceMale1: "Calme M",
    voiceFemale2: "Pro F",
    voiceMale2: "Pro M",
    generationSettings: "Paramètres de génération",
    generationSettingsDesc: "Ajustez les hyperparamètres du modèle de langage.",
    tempLabel: "Température créativité",
    maxTokensLabel: "Longueur de réponse maximale",
    streamModeLabel: "Mode streaming avec affichage progressif",
    currentSubscription: "Votre abonnement actuel",
    statusActive: "Actif",
    statusStandard: "Standard",
    subPremium: "Hemo Premium 🌟",
    subStandard: "Hemo Standard",
    unlockPremium: "Débloquez les fonctionnalités Premium",
    featureVision: "Vision médicale : Analyse d'images comme les radiographies et les ordonnances",
    featureVoice: "Interactions vocales : Reconnaissance vocale pour parler avec l'assistant",
    featurePdf: "Analyse de documents PDF complets",
    premiumPricing: "Tarification Premium",
    cancelAnytime: "Annulation simple à tout moment",
    perMonth: "/mois",
    becomePremium: "Devenir Premium 🚀",
    manageBilling: "Gérer la facturation Stripe",
    premiumDescription: "Merci pour votre confiance ! Vous disposez actuellement d'un accès illimité à toutes nos fonctionnalités Premium, y compris la vision médicale, la synthèse vocale et la transcription vocale.",
    loading: "Chargement...",
  },
  en: {
    settings: "Settings",
    general: "General",
    audioModel: "Audio & Model",
    subscription: "Subscription",
    interfaceSettings: "Interface Settings",
    interfaceSettingsDesc: "Customize the display and visual experience of the application.",
    appTheme: "Application Theme",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    appLanguage: "Interface Language",
    langFr: "Français",
    langEn: "English",
    expertMode: "Expert Mode",
    expertModeDesc: "Displays detailed visual descriptions and technical analysis weights in responses.",
    discussionActions: "Chat Actions",
    discussionActionsDesc: "Clear local history or reset the chat session.",
    resetDiscussion: "Reset Chat",
    resetConfirm: "Are you sure you want to clear the history of this discussion?",
    ttsTitle: "TTS Text-to-Speech",
    ttsDesc: "Enable automatic audio reading of assistant responses.",
    ttsAuto: "Automatic Audio Reading",
    assistantVoice: "Assistant Voice",
    voiceLila: "Lila Natural",
    voiceEthan: "Ethan Natural",
    voiceFemale1: "Gentle F",
    voiceMale1: "Calm M",
    voiceFemale2: "Pro F",
    voiceMale2: "Pro M",
    generationSettings: "Generation Settings",
    generationSettingsDesc: "Adjust language model hyperparameters.",
    tempLabel: "Creativity Temperature",
    maxTokensLabel: "Maximum Response Length",
    streamModeLabel: "Streaming mode with progressive display",
    currentSubscription: "Your Current Subscription",
    statusActive: "Active",
    statusStandard: "Standard",
    subPremium: "Hemo Premium 🌟",
    subStandard: "Hemo Standard",
    unlockPremium: "Unlock Premium Features",
    featureVision: "Medical Vision: Analysis of images such as X-rays and prescriptions",
    featureVoice: "Voice Interactions: Voice recognition to speak with the assistant",
    featurePdf: "Analysis of complete PDF documents",
    premiumPricing: "Premium Pricing",
    cancelAnytime: "Cancel anytime easily",
    perMonth: "/month",
    becomePremium: "Become Premium 🚀",
    manageBilling: "Manage Stripe Billing",
    premiumDescription: "Thank you for your trust! You currently have unlimited access to all our Premium features, including medical vision, text-to-speech, and voice transcription.",
    loading: "Loading...",
  }
};

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

  const lang = config.language || "fr";
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS["fr"][key];

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
            <span>{t("settings")}</span>
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
              <span>{t("general")}</span>
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
              <span>{t("audioModel")}</span>
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
              <span>{t("subscription")}</span>
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
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>{t("interfaceSettings")}</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    {t("interfaceSettingsDesc")}
                  </p>
                  
                  <div style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                    {renderSelect(t("appTheme"), config.theme, v => set("theme", v), [
                      { value: "light", label: t("themeLight") },
                      { value: "dark", label: t("themeDark") }
                    ])}
                  </div>

                  <div style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                    {renderSelect(t("appLanguage"), config.language ?? "fr", v => set("language", v), [
                      { value: "fr", label: t("langFr") },
                      { value: "en", label: t("langEn") }
                    ])}
                  </div>

                  <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, paddingTop: 8 }}>
                    {renderToggle(t("expertMode"), config.expertMode, v => set("expertMode", v))}
                    {config.expertMode && (
                      <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--accent-muted)", borderRadius: 8, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <Info size={13} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {t("expertModeDesc")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4, color: "var(--danger)" }}>{t("discussionActions")}</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    {t("discussionActionsDesc")}
                  </p>
                  <button
                    onClick={() => {
                      if (confirm(t("resetConfirm"))) {
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
                    <span>{t("resetDiscussion")}</span>
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
                    <span>{t("ttsTitle")}</span>
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    {t("ttsDesc")}
                  </p>
                  {renderToggle(t("ttsAuto"), config.ttsEnabled, v => set("ttsEnabled", v))}
                  {config.ttsEnabled && (
                    renderSelect(t("assistantVoice"), config.voiceType, v => set("voiceType", v), [
                      { value: "lila",    label: t("voiceLila") },
                      { value: "ethan",   label: t("voiceEthan") },
                      { value: "female1", label: t("voiceFemale1") },
                      { value: "male1",   label: t("voiceMale1") },
                      { value: "female2", label: t("voiceFemale2") },
                      { value: "male2",   label: t("voiceMale2") },
                    ])
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Thermometer size={16} />
                    <span>{t("generationSettings")}</span>
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                    {t("generationSettingsDesc")}
                  </p>
                  {renderRange(t("tempLabel"), config.temperature ?? 0.7, v => set("temperature", v), 0.1, 1.5, 0.05)}
                  {renderRange(t("maxTokensLabel"), config.maxTokens ?? 500, v => set("maxTokens", v), 100, 1500, 50)}
                  {renderToggle(t("streamModeLabel"), config.streamMode, v => set("streamMode", v))}
                </div>
              </div>
            )}

            {/* Subscription & Pricing Tab */}
            {activeTab === "billing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{t("currentSubscription")}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>
                      {loggedUser?.subscription_status === "active" ? t("subPremium") : t("subStandard")}
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
                    }}>{t("statusActive")}</span>
                  ) : (
                    <span style={{
                      fontSize: "0.72rem",
                      background: "var(--border)",
                      color: "var(--text-secondary)",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontWeight: 600
                    }}>{t("statusStandard")}</span>
                  )}
                </div>

                {loggedUser?.subscription_status !== "active" ? (
                  <>
                    <div style={{
                      background: "rgba(16, 163, 127, 0.08)",
                      border: "1px solid rgba(16, 163, 127, 0.2)",
                      borderRadius: 12,
                      padding: 16,
                    }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <Zap size={14} style={{ color: "var(--accent)" }} />
                        <span>{t("unlockPremium")}</span>
                      </h4>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 8, padding: 0, margin: 0, listStyle: "none" }}>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span>{t("featureVision")}</span>
                        </li>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span>{t("featureVoice")}</span>
                        </li>
                        <li style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          <span>{t("featurePdf")}</span>
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
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t("premiumPricing")}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{t("cancelAnytime")}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "white" }}>8.00 $</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t("perMonth")}</span>
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
                        background: "linear-gradient(135deg, #10a37f 0%, #4BBE4F 100%)",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(16, 163, 127, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 8
                      }}
                    >
                      {billingLoading ? <Loader2 size={16} className="spinner" /> : t("becomePremium")}
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
                      {t("premiumDescription")}
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
                      {billingLoading ? <Loader2 size={16} className="spinner" /> : t("manageBilling")}
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
