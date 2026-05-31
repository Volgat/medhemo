"use client";

import {
  Settings2,
  Trash2,
  MessageSquarePlus,
  LogOut
} from "lucide-react";

const TRANSLATIONS = {
  fr: {
    history: "Historique",
    clearHistory: "Effacer l'historique",
    noConversations: "Aucune conversation",
    settings: "Paramètres",
    logout: "Déconnexion",
  },
  en: {
    history: "History",
    clearHistory: "Clear history",
    noConversations: "No conversations",
    settings: "Settings",
    logout: "Logout",
  }
};

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({
  isOpen = true,
  config = {},
  history = [],
  onClearHistory,
  onLogout,
  loggedUser,
  onLogoClick,
  onSettingsClick
}) {
  const lang = config.language || "fr";
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS["fr"][key];

  return (
    <nav className={`sidebar ${isOpen ? "" : "collapsed"}`}>
      {/* Logo */}
      <div className="sidebar-logo" onClick={onLogoClick} style={{ cursor: "pointer" }}>
        <div className="logo-icon" style={{ background: "linear-gradient(135deg, #4BBE4F 0%, #10a37f 100%)" }}>
          <span style={{ color: "white", fontSize: "1rem" }}>H</span>
        </div>
        <span>Hemo Lab</span>
      </div>

      {/* History header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", marginTop: 8 }}>
        <span className="sidebar-section" style={{ margin: 0, padding: 0 }}>{t("history")}</span>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            style={{ color: "var(--sidebar-muted)", display: "flex", cursor: "pointer", border: "none", background: "none", padding: 2, borderRadius: 4, transition: "color 0.15s" }}
            title={t("clearHistory")}
            onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--sidebar-muted)"}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Conversation history entries */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
        {history.length === 0 ? (
          <div style={{ padding: "10px 8px", fontSize: "0.75rem", color: "var(--sidebar-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquarePlus size={13} />
            <span>{t("noConversations")}</span>
          </div>
        ) : (
          history
            .filter(m => m.role === "user")
            .slice(-12)
            .reverse()
            .map((m, i) => (
              <div key={i} className="sidebar-item" style={{ cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--sidebar-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {m.isTranscription ? "Audio" : m.preview ? "Image" : "Message"}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--sidebar-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {m.content?.slice(0, 50)}{m.content?.length > 50 ? "…" : ""}
                </span>
              </div>
            ))
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer" style={{ padding: "12px 8px", borderTop: "1px solid var(--sidebar-border)" }}>
        {loggedUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {/* Profile display */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "var(--sidebar-text)"
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.75rem"
              }}>
                {loggedUser.username?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {loggedUser.username}
              </span>
              {loggedUser.subscription_status === "active" && (
                <span style={{
                  fontSize: "0.6rem",
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  color: "#1e1b4b",
                  padding: "2px 6px",
                  borderRadius: 10,
                  fontWeight: 800
                }}>PRO</span>
              )}
            </div>

            {/* Settings button */}
            <button
              onClick={onSettingsClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "var(--sidebar-text)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "var(--sidebar-hover)"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              <Settings2 size={15} />
              <span>{t("settings")}</span>
            </button>
          </div>
        )}

        {loggedUser && (
          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "8px 10px", borderRadius: 8,
              background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)",
              fontSize: "0.82rem", fontWeight: 600,
              transition: "background 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
          >
            <LogOut size={15} />
            <span>{t("logout")}</span>
          </button>
        )}
        <div style={{ fontSize: "0.62rem", color: "var(--sidebar-muted)", textAlign: "center", marginTop: 12 }}>
          Hemo Lab v3.0
        </div>
      </div>
    </nav>
  );
}
