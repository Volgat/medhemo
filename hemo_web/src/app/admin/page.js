"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Country name resolver ─────────────────────────────────────────────────────
const COUNTRY_NAMES = {
  FR:"France",US:"United States",CA:"Canada",GB:"United Kingdom",DE:"Germany",
  BE:"Belgium",CH:"Switzerland",MA:"Morocco",SN:"Senegal",CI:"Côte d'Ivoire",
  CM:"Cameroon",DZ:"Algeria",TN:"Tunisia",ML:"Mali",BJ:"Benin",GA:"Gabon",
  MG:"Madagascar",RW:"Rwanda",NG:"Nigeria",GH:"Ghana",ZA:"South Africa",
  BR:"Brazil",ES:"Spain",IT:"Italy",NL:"Netherlands",PT:"Portugal",
  AU:"Australia",JP:"Japan",IN:"India",MX:"Mexico",AR:"Argentina",
};
const countryName = (code) => COUNTRY_NAMES[code?.toUpperCase()] || code || "Unknown";

const FLAG_URL = (code) =>
  `https://flagcdn.com/24x18/${(code || "").toLowerCase()}.png`;

// ── Mini SVG chart helpers ────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#22c55e", height = 48 }) {
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
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g-${color.replace("#","")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

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
      <circle cx={cx} cy={cy} r={r - 12} fill="rgba(0,0,0,0.25)" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} opacity="0.92">
          <title>{a.label}: {a.value} ({a.pct}%)</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 28} fill="var(--card-bg, #1a1f2e)" />
    </svg>
  );
}

function BarChart({ data = [], color = "#22c55e", height = 120 }) {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data.map(d => d.users || d.count || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "0 4px" }}>
      {data.slice(0, 10).map((d, i) => {
        const val = d.users || d.count || 0;
        const h   = Math.max((val / max) * (height - 28), 4);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted,#6b7280)", fontWeight: 600 }}>{val}</span>
            <div
              style={{
                width: "100%", height: h,
                background: `linear-gradient(180deg, ${color}, ${color}88)`,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.6s ease",
              }}
              title={`${d.country || d.date || ""}: ${val}`}
            />
            <span style={{ fontSize: 9, color: "var(--text-muted,#6b7280)", textAlign: "center", maxWidth: 40, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {d.country ? countryName(d.country).split(" ")[0] : (d.date || "").slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = "#22c55e", sparkData, trend }) {
  return (
    <div style={{
      background:   "var(--card-bg, #1a1f2e)",
      border:       `1px solid ${color}22`,
      borderRadius: 20,
      padding:      "24px 28px 16px",
      position:     "relative",
      overflow:     "hidden",
      display:      "flex",
      flexDirection:"column",
      gap:          8,
      transition:   "transform 0.2s, box-shadow 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Glow blob */}
      <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120, background:`radial-gradient(circle, ${color}18 0%, transparent 70%)`, borderRadius:"50%", pointerEvents:"none" }} />

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:28, lineHeight:1 }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize:12, fontWeight:700, color: trend >= 0 ? "#22c55e" : "#ef4444", background: trend >= 0 ? "#22c55e15" : "#ef444415", padding:"2px 8px", borderRadius:8 }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize:"2.2rem", fontWeight:800, color:"var(--text-primary,#f1f5f9)", lineHeight:1.1, letterSpacing:"-0.02em" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize:13, color:"var(--text-muted,#6b7280)", marginTop:4, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:color, marginTop:2, fontWeight:600 }}>{sub}</div>}
      </div>

      {sparkData?.length > 0 && (
        <div style={{ marginTop:8, opacity:0.8 }}>
          <Sparkline data={sparkData} color={color} height={44} />
        </div>
      )}
    </div>
  );
}

// ── Modality pill ─────────────────────────────────────────────────────────────
const MODALITY_COLORS = { text:"#3b82f6", voice:"#8b5cf6", image:"#f59e0b", multimodal:"#22c55e" };
const MODALITY_ICONS  = { text:"✍️", voice:"🎙️", image:"🖼️", multimodal:"⚡" };

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed,    setAuthed]    = useState(false);
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
        setErr(json.error || `Erreur serveur (${res.status}). Assurez-vous que le backend RunPod est actif.`);
        return;
      }
      if (json.error) { setErr(json.error); return; }
      setData(json);
      setLastRefresh(new Date());
    } catch(e) {
      setErr("Impossible de contacter le serveur backend. Il est probablement hors-ligne.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthErr("");
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
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!authed) return;
    intervalRef.current = setInterval(() => fetchMetrics(), 60000);
    return () => clearInterval(intervalRef.current);
  }, [authed, fetchMetrics]);

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d1117", fontFamily:"'Inter',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
        <div style={{ width:"100%", maxWidth:420, background:"#161b27", borderRadius:24, padding:"48px 40px", border:"1px solid #22c55e22", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🩸</div>
            <h1 style={{ fontSize:"1.8rem", fontWeight:800, color:"#f1f5f9", margin:0 }}>Hemo Admin</h1>
            <p style={{ color:"#6b7280", marginTop:8, fontSize:14 }}>Tableau de bord métriques</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Mot de passe admin"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width:"100%", padding:"14px 16px", borderRadius:12, background:"#0d1117", border:"1px solid #22c55e44", color:"#f1f5f9", fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:16 }}
              autoFocus
            />
            {authErr && <div style={{ color:"#ef4444", fontSize:13, marginBottom:12, textAlign:"center" }}>{authErr}</div>}
            <button type="submit" style={{ width:"100%", padding:"14px", borderRadius:12, background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"white", fontWeight:700, fontSize:15, border:"none", cursor:"pointer", letterSpacing:"0.02em" }}>
              Accéder au dashboard →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
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
    { label:"Pro",   value: activeSubs, color:"#22c55e" },
    { label:"Free",  value: freeUsers,  color:"#3b82f6" },
  ];

  const modalityDonut = Object.entries(modalities).map(([k, v]) => ({
    label: k, value: v, color: MODALITY_COLORS[k] || "#94a3b8",
  }));

  const sortable = (col, label) => (
    <th onClick={() => { setSortCol(col); setSortDir(p => col === sortCol ? (p === "asc" ? "desc" : "asc") : "desc"); }}
      style={{ padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:600, color:"#6b7280", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap" }}>
      {label} {sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const S = {
    page:  { minHeight:"100vh", background:"#0d1117", fontFamily:"'Inter',sans-serif", color:"#f1f5f9" },
    hdr:   { background:"#161b27", borderBottom:"1px solid #22c55e18", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64, position:"sticky", top:0, zIndex:50, backdropFilter:"blur(12px)" },
    main:  { maxWidth:1400, margin:"0 auto", padding:"32px 24px" },
    grid4: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:20, marginBottom:28 },
    grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 },
    card:  { background:"#161b27", borderRadius:20, padding:"24px", border:"1px solid #22c55e12" },
    cardT: { fontSize:13, fontWeight:600, color:"#9ca3af", marginBottom:16, display:"flex", alignItems:"center", gap:8 },
    badge: (c) => ({ display:"inline-block", padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:700, background:`${c}18`, color:c }),
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#0d1117; }
        ::-webkit-scrollbar-thumb { background:#22c55e44; border-radius:3px; }
        table { border-collapse:collapse; width:100%; }
        th,td { border-bottom: 1px solid #22c55e0a; }
        tr:hover td { background:#22c55e06; }
      `}</style>

      {/* Header */}
      <header style={S.hdr}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:28 }}>🩸</span>
          <div>
            <div style={{ fontWeight:800, fontSize:"1.1rem", color:"#f1f5f9" }}>Hemo Admin</div>
            <div style={{ fontSize:11, color:"#22c55e", fontWeight:600 }}>Tableau de bord métriques</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {lastRefresh && (
            <span style={{ fontSize:12, color:"#4b5563" }}>
              Actualisé {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => fetchMetrics()} disabled={loading}
            style={{ padding:"8px 18px", borderRadius:10, background:"#22c55e18", border:"1px solid #22c55e44", color:"#22c55e", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            {loading ? "⏳ Chargement..." : "⟳ Actualiser"}
          </button>
          <button onClick={() => { setAuthed(false); setData(null); }}
            style={{ padding:"8px 14px", borderRadius:10, background:"#ef444415", border:"1px solid #ef444444", color:"#ef4444", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background:"#161b27", borderBottom:"1px solid #22c55e12", padding:"0 32px", display:"flex", gap:0 }}>
        {[["overview","📊 Aperçu"],["users","👥 Utilisateurs"],["activity","📈 Activité"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding:"14px 22px", background:"none", border:"none", borderBottom: tab===k ? "2px solid #22c55e" : "2px solid transparent",
              color: tab===k ? "#22c55e" : "#6b7280", fontWeight: tab===k ? 700 : 500, fontSize:14, cursor:"pointer", transition:"all 0.15s" }}>
            {l}
          </button>
        ))}
      </div>

      <main style={S.main}>
        {err && (
          <div style={{ padding:"16px 20px", borderRadius:12, background:"#ef444415", border:"1px solid #ef444444", color:"#ef4444", marginBottom:24, fontSize:14 }}>
            ⚠️ {err}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#6b7280" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
            <p>Chargement des métriques depuis RunPod…</p>
          </div>
        )}

        {data && tab === "overview" && (
          <>
            {/* KPI Cards */}
            <div style={S.grid4}>
              <KpiCard icon="👥" label="Utilisateurs totaux" value={totalUsers} color="#22c55e"
                sub={`+${new30d} ce mois`} sparkData={dailySigns} />
              <KpiCard icon="💎" label="Abonnements Pro" value={activeSubs} color="#8b5cf6"
                sub={`Taux conversion ${convRate}%`} />
              <KpiCard icon="🆓" label="Utilisateurs gratuits" value={freeUsers} color="#3b82f6"
                sub={`${totalUsers ? Math.round((freeUsers/totalUsers)*100) : 0}% du total`} />
              <KpiCard icon="🔥" label="Actifs (7 jours)" value={active7d} color="#f59e0b"
                sub={`${totalUsers ? Math.round((active7d/totalUsers)*100) : 0}% base active`} />
              <KpiCard icon="💬" label="Messages totaux" value={totalMsgs} color="#06b6d4"
                sparkData={dailyMsgs} />
              <KpiCard icon="📅" label="Messages (7 jours)" value={messages7d} color="#ec4899"
                sub={`~${active7d > 0 ? Math.round(messages7d/active7d) : 0} msg/user actif`} />
              <KpiCard icon="🌍" label="Pays représentés" value={countries.length} color="#f97316"
                sub={countries[0] ? `Top: ${countryName(countries[0].country)}` : "Aucun"} />
              <KpiCard icon="📬" label="Nouveaux (30j)" value={new30d} color="#22c55e"
                sub="Inscriptions récentes" />
            </div>

            {/* Charts row */}
            <div style={{ ...S.grid2, gridTemplateColumns:"1fr 1fr 1fr" }}>
              {/* Donut plans */}
              <div style={S.card}>
                <div style={S.cardT}>📊 Répartition plans</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:24 }}>
                  <DonutChart segments={donutData} size={140} />
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {donutData.map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:s.color }} />
                        <span style={{ fontSize:13, color:"#9ca3af" }}>{s.label}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginLeft:"auto" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Donut modalities */}
              <div style={S.card}>
                <div style={S.cardT}>⚡ Modalités d'usage</div>
                {Object.keys(modalities).length > 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:24 }}>
                    <DonutChart segments={modalityDonut} size={140} />
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {modalityDonut.map(s => (
                        <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:16 }}>{MODALITY_ICONS[s.label] || "💬"}</span>
                          <span style={{ fontSize:12, color:"#9ca3af" }}>{s.label}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginLeft:"auto" }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"32px 0", color:"#4b5563", fontSize:13 }}>Pas encore de données</div>
                )}
              </div>

              {/* Countries bar */}
              <div style={S.card}>
                <div style={S.cardT}>🌍 Top pays</div>
                {countries.length > 0 ? (
                  <>
                    <BarChart data={countries} color="#22c55e" height={130} />
                    <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
                      {countries.slice(0,5).map((c, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <img src={FLAG_URL(c.country)} alt={c.country} style={{ borderRadius:2 }} onError={e=>e.target.style.display="none"} />
                          <span style={{ fontSize:12, color:"#9ca3af", flex:1 }}>{countryName(c.country)}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9" }}>{c.users}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:"32px 0", color:"#4b5563", fontSize:13 }}>Aucun pays enregistré</div>
                )}
              </div>
            </div>
          </>
        )}

        {data && tab === "users" && (
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={S.cardT}>👥 Utilisateurs récents ({recentUsers.length})</div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..."
                style={{ padding:"8px 14px", borderRadius:10, background:"#0d1117", border:"1px solid #22c55e22", color:"#f1f5f9", fontSize:13, outline:"none", width:240 }} />
            </div>
            <div style={{ overflowX:"auto" }}>
              <table>
                <thead>
                  <tr style={{ background:"#0d1117" }}>
                    {sortable("username","Utilisateur")}
                    {sortable("email","Email")}
                    {sortable("country","Pays")}
                    {sortable("subscription_status","Plan")}
                    {sortable("total_messages","Messages")}
                    {sortable("created_at","Inscription")}
                    {sortable("last_seen","Vu")}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ padding:"32px", textAlign:"center", color:"#4b5563" }}>Aucun utilisateur trouvé</td></tr>
                  )}
                  {recentUsers.map((u, i) => (
                    <tr key={i}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"white", flexShrink:0 }}>
                            {(u.username || "?")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight:600, fontSize:13 }}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:13, color:"#9ca3af" }}>{u.email}</td>
                      <td style={{ padding:"12px 14px" }}>
                        {u.country ? (
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <img src={FLAG_URL(u.country)} alt={u.country} style={{ borderRadius:2 }} onError={e=>e.target.style.display="none"} />
                            <span style={{ fontSize:12, color:"#9ca3af" }}>{countryName(u.country)}</span>
                          </div>
                        ) : <span style={{ fontSize:12, color:"#374151" }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={S.badge(u.subscription_status === "active" ? "#22c55e" : "#6b7280")}>
                          {u.subscription_status === "active" ? "⭐ Pro" : "🆓 Free"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:"#06b6d4" }}>{(u.total_messages || 0).toLocaleString()}</td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:"#6b7280" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:"#6b7280" }}>
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
            <div style={S.card}>
              <div style={S.cardT}>📈 Inscriptions — 30 derniers jours</div>
              {dailySigns.length > 0 ? (
                <>
                  <BarChart data={dailySigns.map(d => ({ date: d.date, count: d.count, users: d.count }))} color="#22c55e" height={160} />
                  <div style={{ marginTop:12, display:"flex", gap:24, justifyContent:"flex-end" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:"#22c55e" }}>{new30d}</div>
                      <div style={{ fontSize:12, color:"#6b7280" }}>nouvelles inscriptions (30j)</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563", fontSize:13 }}>
                  Pas encore de données d'inscription. Les inscriptions apparaîtront ici.
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={S.cardT}>💬 Messages envoyés — 30 derniers jours</div>
              {dailyMsgs.length > 0 ? (
                <>
                  <BarChart data={dailyMsgs.map(d => ({ date: d.date, count: d.count, users: d.count }))} color="#06b6d4" height={160} />
                  <div style={{ marginTop:12, display:"flex", gap:24, justifyContent:"flex-end" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:"#06b6d4" }}>{messages7d}</div>
                      <div style={{ fontSize:12, color:"#6b7280" }}>messages (7 derniers jours)</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563", fontSize:13 }}>
                  Pas encore de données de messages.
                </div>
              )}
            </div>

            <div style={{ ...S.grid2, gridTemplateColumns:"1fr 1fr" }}>
              <div style={S.card}>
                <div style={S.cardT}>⚡ Modalités utilisées</div>
                {Object.keys(modalities).length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {Object.entries(modalities).sort((a,b) => b[1]-a[1]).map(([k, v]) => {
                      const total = Object.values(modalities).reduce((s,x) => s+x, 0);
                      const pct   = Math.round((v / total) * 100);
                      return (
                        <div key={k}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                            <span>{MODALITY_ICONS[k] || "💬"} {k}</span>
                            <span style={{ fontWeight:700, color: MODALITY_COLORS[k] || "#94a3b8" }}>{v} ({pct}%)</span>
                          </div>
                          <div style={{ height:6, borderRadius:3, background:"#1f2937", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background: MODALITY_COLORS[k] || "#94a3b8", borderRadius:3, transition:"width 0.8s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#4b5563", fontSize:13 }}>Aucune donnée</div>
                )}
              </div>

              <div style={S.card}>
                <div style={S.cardT}>🌍 Distribution géographique</div>
                {countries.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {countries.map((c, i) => {
                      const pct = Math.round((c.users / totalUsers) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13, alignItems:"center" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <img src={FLAG_URL(c.country)} alt={c.country} style={{ borderRadius:2 }} onError={e=>e.target.style.display="none"} />
                              <span style={{ color:"#9ca3af" }}>{countryName(c.country)}</span>
                            </div>
                            <span style={{ fontWeight:700, color:"#22c55e" }}>{c.users} ({pct}%)</span>
                          </div>
                          <div style={{ height:5, borderRadius:3, background:"#1f2937", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#22c55e,#16a34a)", borderRadius:3, transition:"width 0.8s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#4b5563", fontSize:13 }}>
                    Les pays apparaîtront dès que les utilisateurs seront géolocalisés.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:40, textAlign:"center", color:"#374151", fontSize:12, borderTop:"1px solid #22c55e0a", paddingTop:24 }}>
          🩸 Hemo Admin Dashboard — données générées à {d.generated_at ? new Date(d.generated_at).toLocaleString("fr-FR") : "—"}
          <span style={{ margin:"0 12px" }}>•</span>
          Actualisation automatique toutes les 60 secondes
        </div>
      </main>
    </div>
  );
}
