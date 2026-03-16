"use client";

import { useState } from "react";
import {
  Volume2,   VolumeX,
  Thermometer, Wind, Settings2,
  MessageSquarePlus, Trash2,
  ChevronDown, ChevronRight,
  Info, LogOut, Sun, Moon
} from "lucide-react";

// ── Default config ────────────────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  ttsEnabled:    true,
  voiceType:     "lila",
  theme:         "dark",
};

// ── Groups for the Paramètres section ────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "6px 8px", borderRadius: 6,
          background: "transparent", border: "none",
          color: "var(--text-muted)", fontSize: "0.68rem",
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
          cursor: "pointer", transition: "color 0.15s",
        }}
      >
        <Icon size={10} />
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {open && <div style={{ padding: "2px 8px 8px" }}>{children}</div>}
    </div>
  );
}

function Label({ children }) {
  return (
    <label style={{ fontSize: "0.71rem", color: "var(--text-secondary)", display: "block", marginBottom: 4, marginTop: 8 }}>
      {children}
    </label>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "6px 8px", borderRadius: 6,
        background: "var(--input-bg)", border: "1px solid var(--border)",
        color: "var(--text-primary)", fontSize: "0.78rem",
        cursor: "pointer", outline: "none",
      }}
    >
      {options.map(({ value: v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  );
}

function RangeInput({ value, onChange, min, max, step, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--text-muted)" }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}
    >
      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{label}</span>
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
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ config = DEFAULT_CONFIG, onConfigChange, history = [], onClearHistory, onLogout, loggedUser, onLogoClick }) {
  const set = (key, value) => {
    onConfigChange?.({ ...config, [key]: value });
    if (key === "theme") {
      document.documentElement.setAttribute("data-theme", value);
    }
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" onClick={onLogoClick} style={{ cursor: "pointer" }}>
        <div className="logo-icon" style={{ background: "linear-gradient(135deg, #a52a2a 0%, #1a1a1a 100%)" }}>
          <span style={{ color: "white", fontSize: "1rem" }}>H</span>
        </div>
        <span>Hemo Lab</span>
      </div>

      {/* History header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", marginTop: 8 }}>
        <span className="sidebar-section" style={{ margin: 0, padding: 0 }}>History</span>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            style={{ color: "var(--text-muted)", display: "flex", cursor: "pointer", border: "none", background: "none", padding: 2, borderRadius: 4, transition: "color 0.15s" }}
            title="Clear history"
            onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Conversation history entries */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
        {history.length === 0 ? (
          <div style={{ padding: "10px 8px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquarePlus size={13} />
            <span>No conversations</span>
          </div>
        ) : (
          history
            .filter(m => m.role === "user")
            .slice(-12)
            .reverse()
            .map((m, i) => (
              <div key={i} className="sidebar-item" style={{ cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {m.isTranscription ? "🎙️ Audio" : m.preview ? "🖼️ Image" : "💬 Message"}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {m.content?.slice(0, 50)}{m.content?.length > 50 ? "…" : ""}
                </span>
              </div>
            ))
        )}
      </div>

      {/* ═══ PARAMÈTRES ═══ */}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>

        <Section title="Assistant Voice" icon={Volume2}>
          <Toggle label="Voice playback" checked={config.ttsEnabled} onChange={v => set("ttsEnabled", v)} />
          {config.ttsEnabled && (
            <>
              <Label>Voice Model</Label>
              <SelectInput value={config.voiceType} onChange={v => set("voiceType", v)} options={[
                { value: "lila",    label: "👩 Lila (Naturelle)" },
                { value: "ethan",   label: "👨 Ethan (Naturel)" },
                { value: "female1", label: "👩 Douce (F)" },
                { value: "male1",   label: "👨 Calme (M)" },
                { value: "female2", label: "👩 Pro (F)" },
                { value: "male2",   label: "👨 Pro (M)" },
              ]} />
            </>
          )}
        </Section>

        <Section title="AI Generation" icon={Thermometer}>
          <RangeInput
            label="Temperature"
            value={config.temperature} onChange={v => set("temperature", v)}
            min={0.1} max={1.5} step={0.05}
          />
          <div style={{ marginTop: 10 }}>
            <RangeInput
              label="Max tokens"
              value={config.maxTokens} onChange={v => set("maxTokens", v)}
              min={100} max={1500} step={50}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <Toggle label="Mode streaming" checked={config.streamMode} onChange={v => set("streamMode", v)} />
          </div>
        </Section>

        <Section title="Interface" icon={Settings2}>
          <div style={{ marginTop: 8 }}>
            <Toggle label="Mode expert" checked={config.expertMode} onChange={v => set("expertMode", v)} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Theme</span>
              <button
                onClick={() => set("theme", config.theme === "dark" ? "light" : "dark")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 8,
                  background: "var(--input-bg)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: "0.75rem",
                }}
              >
                {config.theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
                {config.theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>
          {config.expertMode && (
            <div style={{ marginTop: 6, padding: "6px 8px", background: "var(--accent-muted)", borderRadius: 6, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <Info size={11} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Displays Qwen3-VL visual descriptions and EARCP weights in responses.
              </span>
            </div>
          )}
        </Section>

      </div>

      {/* Footer */}
      <div className="sidebar-footer" style={{ padding: "12px 8px" }}>
        {loggedUser && (
          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", borderRadius: 8,
              background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)",
              fontSize: "0.875rem", fontWeight: 600, marginBottom: 12,
              transition: "background 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        )}
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
          Hemo Lab v3.0
        </div>
      </div>
    </nav>
  );
}
