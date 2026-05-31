"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Country name resolver ─────────────────────────────────────────────────────
const COUNTRY_NAMES = {
  FR: "France", US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany",
  BE: "Belgium", CH: "Switzerland", MA: "Morocco", SN: "Senegal", CI: "Côte d'Ivoire",
  CM: "Cameroon", DZ: "Algeria", TN: "Tunisia", ML: "Mali", BJ: "Benin", GA: "Gabon",
  MG: "Madagascar", RW: "Rwanda", NG: "Nigeria", GH: "Ghana", ZA: "South Africa",
  BR: "Brazil", ES: "Spain", IT: "Italy", NL: "Netherlands", PT: "Portugal",
  AU: "Australia", JP: "Japan", IN: "India", MX: "Mexico", AR: "Argentina",
};
const countryName = (code) => COUNTRY_NAMES[code?.toUpperCase()] || code || "Unknown";

const FLAG_URL = (code) =>
  `https://flagcdn.com/24x18/${(code || "").toLowerCase()}.png`;

// ── Minimalist SVG Icons (OpenAI/Anthropic Style) ──────────────────────────────
const ICONS = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  Message: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Globe: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Activity: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#71717a" }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ChartUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
};

// ── Mini SVG Sparkline Chart ──────────────────────────────────────────────────
function Sparkline({ data = [], color = "#10b981", height = 48 }) {
  if (!data.length) return <div style={{ height }} />;
  const vals = data.map((d) => d.count);
  const max   = Math.max(...vals, 1);
  const w     = 280;
  const pts   = vals.map((v, i) => {
    const x = (i / (vals.length - 1 || 1)) * w;
    const y = height - (v / max) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const area = `0,${height} ${pts.join(" ")} ${w},${height}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g-${color.replace("#","")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 140 }) {
  const total  = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = size / 2 - 14;
  let   cursor = -Math.PI / 2;

  const arcs = segments.map((seg) => {
    const frac  = seg.value / total;
    const angle = frac * Math.PI * 2;
    const x1    = cx + r * Math.cos(cursor);
    const y1    = cy + r * Math.sin(cursor);
    cursor     += angle;
    const x2    = cx + r * Math.cos(cursor);
    const y2    = cy + r * Math.sin(cursor);
    const large = angle > Math.PI ? 1 : 0;
    const d     = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...seg, d, pct: Math.round(frac * 100) };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r - 12} fill="rgba(255,255,255,0.02)" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} opacity="0.85">
          <title>{a.label}: {a.value} ({a.pct}%)</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 26} fill="#09090b" />
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data = [], color = "#3f3f46", height = 120 }) {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data.map(d => d.users || d.count || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height, padding: "0 4px" }}>
      {data.slice(0, 10).map((d, i) => {
        const val = d.users || d.count || 0;
        const h   = Math.max((val / max) * (height - 28), 4);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 500 }}>{val}</span>
            <div
              style={{
                width: "100%", height: h,
                background: color,
                borderRadius: "2px 2px 0 0",
                transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              title={`${d.country || d.date || ""}: ${val}`}
            />
            <span style={{ fontSize: 9, color: "#71717a", textAlign: "center", maxWidth: 40, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {d.country ? countryName(d.country).slice(0,3).toUpperCase() : (d.date || "").slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = "#27272a", sparkData, trend }) {
  return (
    <div style={{
      background:   "#18181b",
      border:       `1px solid #27272a`,
      borderRadius: 12,
      padding:      "20px 24px",
      display:      "flex",
      flexDirection:"column",
      gap:          6,
      position:     "relative",
      overflow:     "hidden",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", color: "#a1a1aa" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#71717a" }}>{label}</span>
        <div style={{ color: "#a1a1aa" }}>{icon}</div>
      </div>

      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop: 4 }}>
        <span style={{ fontSize:"1.75rem", fontWeight:700, color:"#f4f4f5", letterSpacing:"-0.02em", fontFamily:"monospace" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && (
          <span style={{ fontSize:11, fontWeight:600, color: trend >= 0 ? "#10b981" : "#ef4444" }}>
            {trend >= 0 ? "+" : "-"} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {sub && <div style={{ fontSize:11, color:"#71717a", fontWeight:400 }}>{sub}</div>}

      {sparkData?.length > 0 && (
        <div style={{ marginTop:12, opacity:0.6 }}>
          <Sparkline data={sparkData} color="#a1a1aa" height={36} />
        </div>
      )}
    </div>
  );
}

// ── Modality Config ───────────────────────────────────────────────────────────
const MODALITY_COLORS = { text:"#3f3f46", voice:"#52525b", image:"#71717a", multimodal:"#a1a1aa" };
const MODALITY_LABELS = { text:"TEXT", voice:"VOICE", image:"IMAGE", multimodal:"MULTIMODAL" };

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed,    setAuthed]    = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [password,  setPassword]  = useState("");
  const [authErr,   setAuthErr]   = useState("");
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [search,    setSearch]    = useState("");
  const [sortCol,   setSortCol]   = useState("created_at");
  const [sortDir,   setSortDir]   = useState("desc");
  const [tab,       setTab]       = useState("overview");
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async (pwd) => {
    const usePwd = pwd || password;
    setLoading(true);
    setErr("");
    try {
      const res  = await fetch(`/api/admin/metrics?token=${encodeURIComponent(usePwd)}`);
      let json = {};
      try { json = await res.json(); } catch {}
      if (!res.ok) {
        setErr(json.error || `Error ${res.status}. Please check if the RunPod endpoint is active.`);
        return;
      }
      if (json.error) { setErr(json.error); return; }
      setData(json);
      setLastRefresh(new Date());
    } catch(e) {
      setErr("Failed to contact the backend server. The RunPod endpoint is likely offline.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthErr("");
    setAuthLoading(true);
    try {
      const res  = await fetch(`/api/admin/metrics?token=${encodeURIComponent(password)}`);
      let json = {};
      try { json = await res.json(); } catch {}
      if (res.ok && !json.error) {
        setAuthed(true);
        setData(json);
        setLastRefresh(new Date());
      } else if (res.status === 401) {
        setAuthErr("Mot de passe incorrect.");
      } else {
        setAuthErr(json.error || `Erreur serveur (${res.status}). Le backend RunPod est hors-ligne.`);
      }
    } catch (err) {
      setAuthErr("Impossible de contacter le serveur backend. Le serveur RunPod est probablement arrêté (fonds insuffisants).");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!authed) return;
    intervalRef.current = setInterval(() => fetchMetrics(), 60000);
    return () => clearInterval(intervalRef.current);
  }, [authed, fetchMetrics]);

  // ── Login Screen (Anthropic/OpenAI Minimal Style) ──────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#09090b", fontFamily:"system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-loader {
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div style={{ width:"100%", maxWidth:400, background:"#09090b", border:"1px solid #27272a", borderRadius:8, padding:"40px 32px", boxShadow:"0 4px 30px rgba(0,0,0,0.4)" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"inline-flex", padding:"8px", background:"#18181b", border:"1px solid #27272a", borderRadius:6, marginBottom:16 }}>
              {ICONS.Lock()}
            </div>
            <h1 style={{ fontSize:"1.25rem", fontWeight:600, color:"#f4f4f5", margin:0, letterSpacing:"-0.01em" }}>Console Administrateur</h1>
            <p style={{ color:"#71717a", marginTop:4, fontSize:13 }}>Authentifiez-vous pour charger les métriques du système</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"#a1a1aa" }}>Clé d'administration</label>
              <input
                type="password"
                placeholder={authLoading ? "Vérification en cours..." : "Entrez le mot de passe"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={authLoading}
                style={{
                  width:"100%", padding:"10px 12px", borderRadius:6, background: authLoading ? "#0d0d0e" : "#18181b",
                  border:"1px solid #27272a", color: authLoading ? "#71717a" : "#f4f4f5", fontSize:14, outline:"none",
                  boxSizing:"border-box", transition:"border-color 0.15s"
                }}
                onFocus={e => e.target.style.borderColor = "#52525b"}
                onBlur={e => e.target.style.borderColor = "#27272a"}
                autoFocus
              />
            </div>
            {authErr && <div style={{ color:"#f87171", fontSize:12, marginBottom:16 }}>{authErr}</div>}
            <button 
              type="submit" 
              disabled={authLoading}
              style={{ 
                width:"100%", padding:"10px", borderRadius:6, 
                background: authLoading ? "#27272a" : "#f4f4f5", 
                color: authLoading ? "#71717a" : "#09090b", 
                fontWeight:600, fontSize:14, border:"none", 
                cursor: authLoading ? "not-allowed" : "pointer", 
                transition:"all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
              onMouseEnter={e => { if(!authLoading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={e => { if(!authLoading) e.currentTarget.style.opacity = "1"; }}>
              {authLoading ? (
                <>
                  <svg className="spin-loader" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard Screen ──────────────────────────────────────────────────────────
  const d = data || {};
  const totalMsgs     = d.total_messages || 0;
  const totalUsers    = d.total_users    || 0;
  const activeSubs    = d.active_subs    || 0;
  const freeUsers     = d.free_users     || 0;
  const active7d      = d.active_7d      || 0;
  const new30d        = d.new_30d        || 0;
  const messages7d    = d.messages_7d    || 0;
  const convRate      = totalUsers > 0 ? Math.round((activeSubs / totalUsers) * 100) : 0;

  const modalities   = d.modalities || {};
  const countries    = d.countries  || [];
  const dailySigns   = d.daily_signups  || [];
  const dailyMsgs    = d.daily_messages || [];
  const recentUsers  = (d.recent_users  || []).filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) ||
               u.email?.toLowerCase().includes(search.toLowerCase()) ||
               u.country?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const va = a[sortCol] ?? ""; const vb = b[sortCol] ?? "";
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const donutData = [
    { label:"Pro",   value: activeSubs, color:"#f4f4f5" },
    { label:"Free",  value: freeUsers,  color:"#27272a" },
  ];

  const modalityDonut = Object.entries(modalities).map(([k, v]) => ({
    label: k.toUpperCase(), value: v, color: MODALITY_COLORS[k] || "#27272a",
  }));

  const sortable = (col, label) => (
    <th onClick={() => { setSortCol(col); setSortDir(p => col === sortCol ? (p === "asc" ? "desc" : "asc") : "desc"); }}
      style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#71717a", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", borderBottom:"1px solid #27272a", background:"#09090b" }}>
      {label} {sortCol === col ? (sortDir === "asc" ? " ▴" : " ▾") : ""}
    </th>
  );

  const S = {
    page:  { minHeight:"100vh", background:"#09090b", fontFamily:"'Inter', system-ui, sans-serif", color:"#f4f4f5" },
    hdr:   { background:"#09090b", borderBottom:"1px solid #18181b", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64, position:"sticky", top:0, zIndex:50 },
    main:  { maxWidth:1400, margin:"0 auto", padding:"32px 32px" },
    grid4: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16, marginBottom:24 },
    grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 },
    card:  { background:"#18181b", borderRadius:8, padding:"24px", border:"1px solid #27272a" },
    cardT: { fontSize:12, fontWeight:600, color:"#71717a", marginBottom:20, letterSpacing:"0.05em", textTransform:"uppercase" },
    badge: (c) => ({ display:"inline-flex", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600, background:c === "#22c55e" ? "rgba(16,185,129,0.1)" : "rgba(39,39,42,0.6)", color: c === "#22c55e" ? "#10b981" : "#a1a1aa", border: c === "#22c55e" ? "1px solid rgba(16,185,129,0.2)" : "1px solid #27272a" }),
  };

  return (
    <div style={S.page}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#09090b; }
        ::-webkit-scrollbar-thumb { background:#27272a; border-radius:3px; }
        table { border-collapse:collapse; width:100%; }
        td { border-bottom: 1px solid #18181b; }
        tr:hover td { background:#18181b; }
      `}</style>

      {/* Header */}
      <header style={S.hdr}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ borderRight: "1px solid #27272a", paddingRight: 16 }}>
            <span style={{ fontWeight:700, fontSize:14, letterSpacing:"0.1em", color:"#f4f4f5" }}>HEMO // CONSOLE</span>
          </div>
          <span style={{ fontSize:11, color:"#71717a", fontWeight:500, letterSpacing:"0.02em" }}>SYSTEM METRICS</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {lastRefresh && (
            <span style={{ fontSize:11, color:"#52525b", fontFamily:"monospace" }}>
              REFRESHED: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => fetchMetrics()} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:4, background:"#18181b", border:"1px solid #27272a", color:"#f4f4f5", fontWeight:500, fontSize:12, cursor:"pointer", transition:"border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#52525b"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#27272a"}>
            {ICONS.Refresh()}
            {loading ? "Chargement..." : "Actualiser"}
          </button>
          <button onClick={() => { setAuthed(false); setData(null); }}
            style={{ padding:"6px 12px", borderRadius:4, background:"transparent", border:"1px solid transparent", color:"#71717a", fontWeight:500, fontSize:12, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.color = "#f4f4f5"}
            onMouseLeave={e => e.currentTarget.style.color = "#71717a"}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <div style={{ background:"#09090b", borderBottom:"1px solid #18181b", padding:"0 32px", display:"flex", gap:0 }}>
        {[["overview","Vue d'ensemble"],["users","Comptes Utilisateurs"],["activity","Journaux d'activité"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding:"16px 20px", background:"none", border:"none", borderBottom: tab===k ? "1px solid #f4f4f5" : "1px solid transparent",
              color: tab===k ? "#f4f4f5" : "#71717a", fontWeight: tab===k ? 600 : 500, fontSize:13, cursor:"pointer", transition:"color 0.15s" }}
            onMouseEnter={e => { if(tab!==k) e.currentTarget.style.color = "#a1a1aa"; }}
            onMouseLeave={e => { if(tab!==k) e.currentTarget.style.color = "#71717a"; }}>
            {l}
          </button>
        ))}
      </div>

      <main style={S.main}>
        {err && (
          <div style={{ padding:"12px 16px", borderRadius:6, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.15)", color:"#f87171", marginBottom:24, fontSize:13 }}>
            {err}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign:"center", padding:"100px 0", color:"#71717a" }}>
            <span style={{ fontSize:13 }}>Connexion à l'instance RunPod en cours...</span>
          </div>
        )}

        {data && tab === "overview" && (
          <>
            {/* KPI Cards Grid */}
            <div style={S.grid4}>
              <KpiCard icon={ICONS.Users()} label="Total Utilisateurs" value={totalUsers}
                sub={`+${new30d} inscrits ce mois`} sparkData={dailySigns} />
              <KpiCard icon={ICONS.Database()} label="Membres Pro" value={activeSubs}
                sub={`Taux de conversion : ${convRate}%`} />
              <KpiCard icon={ICONS.Database()} label="Comptes Free" value={freeUsers}
                sub={`${totalUsers ? Math.round((freeUsers/totalUsers)*100) : 0}% de la base`} />
              <KpiCard icon={ICONS.Activity()} label="Actifs (7 jours)" value={active7d}
                sub={`${totalUsers ? Math.round((active7d/totalUsers)*100) : 0}% d'engagement`} />
              <KpiCard icon={ICONS.Message()} label="Total Messages" value={totalMsgs}
                sparkData={dailyMsgs} />
              <KpiCard icon={ICONS.Activity()} label="Messages (7 jours)" value={messages7d}
                sub={`Moyenne : ${active7d > 0 ? Math.round(messages7d/active7d) : 0} msg/user`} />
              <KpiCard icon={ICONS.Globe()} label="Pays couverts" value={countries.length}
                sub={countries[0] ? `Top : ${countryName(countries[0].country)}` : "Aucune donnée"} />
              <KpiCard icon={ICONS.ChartUp()} label="Nouveaux comptes (30j)" value={new30d}
                sub="Croissance brute" />
            </div>

            {/* Charts Row */}
            <div style={{ ...S.grid2, gridTemplateColumns:"1fr 1fr 1fr" }}>
              {/* Plan Distribution */}
              <div style={S.card}>
                <div style={S.cardT}>Répartition des plans</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:32, minHeight: 140 }}>
                  <DonutChart segments={donutData} size={130} />
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {donutData.map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                        <span style={{ fontSize:12, color:"#a1a1aa", fontWeight:500 }}>{s.label}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:"#f4f4f5", marginLeft:"auto", fontFamily:"monospace" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modality Usage */}
              <div style={S.card}>
                <div style={S.cardT}>Modalités d'interactions</div>
                {Object.keys(modalities).length > 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:32, minHeight: 140 }}>
                    <DonutChart segments={modalityDonut} size={130} />
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {modalityDonut.map(s => (
                        <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                          <span style={{ fontSize:11, color:"#a1a1aa", fontWeight:500 }}>{s.label}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:"#f4f4f5", marginLeft:"auto", fontFamily:"monospace" }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 140, color:"#52525b", fontSize:12 }}>Aucun journal d'activité disponible</div>
                )}
              </div>

              {/* Geography */}
              <div style={S.card}>
                <div style={S.cardT}>Top Pays (Utilisateurs)</div>
                {countries.length > 0 ? (
                  <>
                    <BarChart data={countries} color="#52525b" height={110} />
                    <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
                      {countries.slice(0,3).map((c, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <img src={FLAG_URL(c.country)} alt={c.country} style={{ borderRadius:2, width: 16, height: 12, objectFit: "cover" }} onError={e=>e.target.style.display="none"} />
                          <span style={{ fontSize:12, color:"#a1a1aa", flex:1 }}>{countryName(c.country)}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"#f4f4f5", fontFamily:"monospace" }}>{c.users}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 140, color:"#52525b", fontSize:12 }}>Aucun utilisateur localisé</div>
                )}
              </div>
            </div>
          </>
        )}

        {data && tab === "users" && (
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div style={S.cardT}>Profils Utilisateurs ({recentUsers.length})</div>
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <div style={{ position:"absolute", left:10, display:"flex", alignItems:"center" }}>{ICONS.Search()}</div>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un profil..."
                  style={{ padding:"8px 12px 8px 32px", borderRadius:6, background:"#09090b", border:"1px solid #27272a", color:"#f4f4f5", fontSize:12, outline:"none", width:280, transition:"border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#52525b"}
                  onBlur={e => e.target.style.borderColor = "#27272a"} />
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table>
                <thead>
                  <tr>
                    {sortable("username","UTILISATEUR")}
                    {sortable("email","ADRESSE EMAIL")}
                    {sortable("country","PAYS")}
                    {sortable("subscription_status","PLAN ACTIF")}
                    {sortable("total_messages","MESSAGES")}
                    {sortable("created_at","DATE D'INSCRIPTION")}
                    {sortable("last_seen","DERNIÈRE ACTIVITÉ")}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ padding:"32px", textAlign:"center", color:"#52525b", fontSize:12 }}>Aucun enregistrement ne correspond à votre recherche.</td></tr>
                  )}
                  {recentUsers.map((u, i) => (
                    <tr key={i}>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:24, height:24, borderRadius:"50%", background:"#27272a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#a1a1aa", flexShrink:0 }}>
                            {(u.username || "?")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight:600, fontSize:12, color:"#f4f4f5" }}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#a1a1aa" }}>{u.email}</td>
                      <td style={{ padding:"12px 16px" }}>
                        {u.country ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <img src={FLAG_URL(u.country)} alt={u.country} style={{ borderRadius:2, width: 16, height: 12, objectFit: "cover" }} onError={e=>e.target.style.display="none"} />
                            <span style={{ fontSize:12, color:"#a1a1aa" }}>{countryName(u.country)}</span>
                          </div>
                        ) : <span style={{ fontSize:11, color:"#3f3f46" }}>Non localisé</span>}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={S.badge(u.subscription_status === "active" ? "#22c55e" : "#6b7280")}>
                          {u.subscription_status === "active" ? "PRO" : "FREE"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:12, fontWeight:500, color:"#f4f4f5", fontFamily:"monospace" }}>{(u.total_messages || 0).toLocaleString()}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#71717a" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#71717a" }}>
                        {u.last_seen ? new Date(u.last_seen).toLocaleDateString("fr-FR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && tab === "activity" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {/* User growth graph */}
            <div style={S.card}>
              <div style={S.cardT}>Nouvelles inscriptions (30j)</div>
              {dailySigns.length > 0 ? (
                <>
                  <BarChart data={dailySigns.map(d => ({ date: d.date, count: d.count, users: d.count }))} color="#27272a" height={150} />
                  <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:"#f4f4f5", fontFamily:"monospace" }}>{new30d}</div>
                      <div style={{ fontSize:11, color:"#71717a" }}>nouveaux comptes sur les 30 derniers jours</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 150, color:"#52525b", fontSize:12 }}>
                  Aucune inscription récente enregistrée.
                </div>
              )}
            </div>

            {/* Messages volume graph */}
            <div style={S.card}>
              <div style={S.cardT}>Volume de conversations (30j)</div>
              {dailyMsgs.length > 0 ? (
                <>
                  <BarChart data={dailyMsgs.map(d => ({ date: d.date, count: d.count, users: d.count }))} color="#52525b" height={150} />
                  <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:"#f4f4f5", fontFamily:"monospace" }}>{messages7d}</div>
                      <div style={{ fontSize:11, color:"#71717a" }}>messages échangés les 7 derniers jours</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 150, color:"#52525b", fontSize:12 }}>
                  Aucune activité de message enregistrée.
                </div>
              )}
            </div>

            {/* Geographical and modality tables details */}
            <div style={{ ...S.grid2, gridTemplateColumns:"1fr 1fr" }}>
              {/* Modalites detailed list */}
              <div style={S.card}>
                <div style={S.cardT}>Répartition par type d'échange</div>
                {Object.keys(modalities).length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {Object.entries(modalities).sort((a,b) => b[1]-a[1]).map(([k, v]) => {
                      const total = Object.values(modalities).reduce((s,x) => s+x, 0);
                      const pct   = Math.round((v / total) * 100);
                      return (
                        <div key={k}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:12 }}>
                            <span style={{ fontWeight:500, color: "#a1a1aa" }}>{MODALITY_LABELS[k] || k.toUpperCase()}</span>
                            <span style={{ fontWeight:600, color: "#f4f4f5", fontFamily:"monospace" }}>{v} ({pct}%)</span>
                          </div>
                          <div style={{ height:4, borderRadius:2, background:"#27272a", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background: "#a1a1aa", borderRadius:2, transition:"width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 100, color:"#52525b", fontSize:12 }}>Aucun log d'activité</div>
                )}
              </div>

              {/* Geographic list details */}
              <div style={S.card}>
                <div style={S.cardT}>Répartition géographique des comptes</div>
                {countries.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {countries.map((c, i) => {
                      const pct = Math.round((c.users / totalUsers) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:12, alignItems:"center" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <img src={FLAG_URL(c.country)} alt={c.country} style={{ borderRadius:2, width: 16, height: 12, objectFit: "cover" }} onError={e=>e.target.style.display="none"} />
                              <span style={{ color:"#a1a1aa" }}>{countryName(c.country)}</span>
                            </div>
                            <span style={{ fontWeight:600, color:"#f4f4f5", fontFamily:"monospace" }}>{c.users} ({pct}%)</span>
                          </div>
                          <div style={{ height:4, borderRadius:2, background:"#27272a", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:"#f4f4f5", borderRadius:2, transition:"width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 100, color:"#52525b", fontSize:12 }}>Aucun utilisateur localisé</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:48, textAlign:"left", color:"#52525b", fontSize:11, borderTop:"1px solid #18181b", paddingTop:20, display:"flex", justifyContent:"space-between" }}>
          <span>Hemo System Analytics — Generated at {d.generated_at ? new Date(d.generated_at).toLocaleString("fr-FR") : "N/A"}</span>
          <span>Automatic refresh: 60s</span>
        </div>
      </main>
    </div>
  );
}
