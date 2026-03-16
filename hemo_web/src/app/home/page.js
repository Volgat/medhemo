"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Mic, Image as ImageIcon, FileText } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const quickActions = [
  {
    icon: <MessageSquare size={20} color="#10a37f" />,
    title: "Chat avec Dr. Hemo",
    subtitle: "Posez vos questions médicales",
    href: "/chat",
  },
  {
    icon: <Mic size={20} color="#10a37f" />,
    title: "Interaction Vocale",
    subtitle: "Parlez directement à Dr. Hemo",
    href: "/voice",
  },
  {
    icon: <ImageIcon size={20} color="#10a37f" />,
    title: "Analyser une image",
    subtitle: "Photo de blessure ou document",
    href: "/vision",
  },
  {
    icon: <FileText size={20} color="#10a37f" />,
    title: "Document médical",
    subtitle: "Résumé de vos résultats d'analyse",
    href: "/files",
  },
];

const suggestions = [
  "Qu'est-ce que la drépanocytose ?",
  "Quels sont les symptômes d'une crise vaso-occlusive ?",
  "Comment gérer la douleur liée à la drépanocytose ?",
  "Quels aliments sont recommandés pour les personnes drépanocytaires ?",
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <div className="welcome-screen">
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: "linear-gradient(135deg, #10a37f, #0a7c61)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                boxShadow: "0 8px 24px rgba(16,163,127,0.3)",
              }}
            >
              🩸
            </div>
            <h1 className="welcome-title">Comment puis-je vous aider ?</h1>
            <p className="welcome-subtitle">
              Je suis <strong style={{ color: "#10a37f" }}>Dr. Hemo</strong>, votre assistant médical IA spécialisé en
              drépanocytose. Posez vos questions en text ou en vocal.
            </p>
          </div>

          {/* Quick actions */}
          <div className="quick-actions-grid">
            {quickActions.map(({ icon, title, subtitle, href }) => (
              <button key={href} className="quick-action-card" onClick={() => router.push(href)}>
                <div className="qa-icon">{icon}</div>
                <div className="qa-text">
                  <strong>{title}</strong>
                  <span>{subtitle}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Suggestion chips */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Questions fréquentes
            </span>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => router.push(`/chat?q=${encodeURIComponent(s)}`)}
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--sidebar-hover)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "var(--input-bg)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <span>{s}</span>
                <MessageSquare size={14} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
