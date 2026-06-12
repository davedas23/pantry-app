// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { subscribeToItems, addItem, updateItem, deleteItem } from "./db";
import ItemModal from "./components/ItemModal";
import LocationManager from "./components/LocationManager";

const DEFAULT_LOCATIONS = [
  { name: "Pantry",         icon: "🗄" },
  { name: "Basement Shelf", icon: "📦" },
  { name: "Kitchen",        icon: "🍳" },
  { name: "Lazy Susan",     icon: "🔄" },
  { name: "Garage",         icon: "🏠" },
  { name: "Drink Fridge",   icon: "🥤" },
  { name: "Mini Fridge",    icon: "❄️" },
  { name: "Kitchen Fridge", icon: "🧊" },
];

const CATEGORIES = ["All Categories","Grains & Pasta","Canned Goods","Spices & Condiments","Snacks","Baking","Beverages","Frozen","Produce","Dairy","Other"];

function getDays(expiry) {
  if (!expiry) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(expiry) - today) / 86400000);
}
function getStatus(days) {
  if (days === null) return "none";
  if (days < 0)  return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "good";
}

const STATUS = {
  expired:  { color:"#ff453a", bg:"rgba(255,69,58,0.12)",  border:"rgba(255,69,58,0.3)",  label:"Expired"      },
  critical: { color:"#ff9f0a", bg:"rgba(255,159,10,0.12)", border:"rgba(255,159,10,0.3)", label:"This week"    },
  warning:  { color:"#ffd60a", bg:"rgba(255,214,10,0.12)", border:"rgba(255,214,10,0.3)", label:"This month"   },
  good:     { color:"#30d158", bg:"rgba(48,209,88,0.12)",  border:"rgba(48,209,88,0.3)",  label:"Good"         },
  none:     { color:"#636366", bg:"rgba(99,99,102,0.12)",  border:"rgba(99,99,102,0.3)",  label:"No expiry"    },
};

function ExpiryBadge({ expiry, noExpiry }) {
  if (noExpiry) return (
    <span style={{ fontSize:"11px", fontWeight:600, padding:"3px 10px", borderRadius:"20px", color:"#636366", background:"rgba(99,99,102,0.12)", border:"1px solid rgba(99,99,102,0.3)", fontFamily:"monospace", whiteSpace:"nowrap" }}>
      ∞ No expiry
    </span>
  );
  const days = getDays(expiry);
  const s = STATUS[getStatus(days)];
  const label = days === null ? "No expiry" : days < 0 ? "Expired" : getStatus(days) === "good" ? `${days}d` : `${days}d left`;
  return (
    <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 10px", borderRadius:"20px", color:s.color, background:s.bg, border:`1px solid ${s.border}`, fontFamily:"monospace", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:"fixed", bottom:"28px", left:"50%", transform:"translateX(-50%)",
      zIndex:300, pointerEvents:"none",
      background: toast.type === "error" ? "#ff453a" : "#1c1c1e",
      border:`1px solid ${toast.type === "error" ? "#ff453a" : "rgba(48,209,88,0.4)"}`,
      borderRadius:"40px", padding:"12px 24px",
      display:"flex", alignItems:"center", gap:"10px",
      boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
      animation:"slideUp 0.2s ease",
    }}>
      <span>{toast.type === "error" ? "⚠️" : "✅"}</span>
      <span style={{ fontSize:"14px", fontWeight:600, color:"#fff", whiteSpace:"nowrap" }}>{toast.msg}</span>
    </div>
  );
}

export default function App() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All Categories");
  const [locFilter, setLocFilter] = useState("All");
  const [sort, setSort]           = useState("expiry");
  const [modal, setModal]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLocMgr, setShowLocMgr] = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);

  const [locations, setLocations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pantry-locations")) || DEFAULT_LOCATIONS; }
    catch { return DEFAULT_LOCATIONS; }
  });

  useEffect(() => {
    const unsub = subscribeToItems(data => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function saveLocations(list) {
    setLocations(list);
    localStorage.setItem("pantry-locations", JSON.stringify(list));
    setShowLocMgr(false);
    showToast("Locations saved");
  }

  async function handleSave(form) {
    const isNew = modal === "new";
    const savedModal = modal;
    setModal(null);
    setSyncing(true);
    try {
      if (isNew) await addItem(form);
      else await updateItem(savedModal.id, form);
      showToast(isNew ? `"${form.name}" added` : `"${form.name}" updated`);
    } catch {
      showToast("Failed to save — check your connection", "error");
    } finally { setSyncing(false); }
  }

  async function handleDelete(id) {
    const item = items.find(i => i.id === id);
    setDeleteConfirm(null);
    setSyncing(true);
    try {
      await deleteItem(id);
      showToast(`"${item?.name || "Item"}" removed`);
    } catch {
      showToast("Failed to delete — check your connection", "error");
    } finally { setSyncing(false); }
  }

  async function handleQty(item, delta) {
    await updateItem(item.id, { ...item, quantity: Math.max(0, (item.quantity||0) + delta) });
  }

  const filtered = useMemo(() => {
    let list = items.filter(i =>
      (category === "All Categories" || i.category === category) &&
      (locFilter === "All" || i.location === locFilter) &&
      [i.name, i.category, i.location, i.notes].some(f => (f||"").toLowerCase().includes(search.toLowerCase()))
    );
    if (sort === "name")     list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    if (sort === "quantity") list = [...list].sort((a,b) => b.quantity - a.quantity);
    if (sort === "location") list = [...list].sort((a,b) => (a.location||"").localeCompare(b.location||""));
    return list;
  }, [items, category, locFilter, search, sort]);

  const stats = useMemo(() => ({
    total:    items.length,
    expired:  items.filter(i => !i.noExpiry && getStatus(getDays(i.expiry)) === "expired").length,
    critical: items.filter(i => !i.noExpiry && getStatus(getDays(i.expiry)) === "critical").length,
    warning:  items.filter(i => !i.noExpiry && getStatus(getDays(i.expiry)) === "warning").length,
    good:     items.filter(i => i.noExpiry  || getStatus(getDays(i.expiry)) === "good").length,
  }), [items]);

  const locIcon = name => locations.find(l => l.name === name)?.icon || "📍";

  const selectStyle = {
    background:"#1c1c1e", border:"1px solid #2c2c2e",
    borderRadius:"12px", padding:"10px 14px",
    color:"#f5f5f0", fontSize:"14px", outline:"none",
    colorScheme:"dark", cursor:"pointer",
    appearance:"none", WebkitAppearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23636366' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
    paddingRight:"34px",
  };

  // ── SIDEBAR ────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{ width:"220px", flexShrink:0, display:"flex", flexDirection:"column", gap:"4px" }}>
      {/* Branding */}
      <div style={{ marginBottom:"24px" }}>
        <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.16em", color:"#0a84ff", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"8px" }}>
          🥡 Pantry Tracker
        </div>
        <h1 style={{ margin:0, fontSize:"28px", fontFamily:"Georgia, serif", fontWeight:800, color:"#fff", lineHeight:1.1 }}>
          The Pantry
        </h1>
        <div style={{ fontSize:"12px", color:"#636366", marginTop:"4px" }}>{items.length} items tracked</div>
      </div>

      {/* Stat pills */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"20px" }}>
        {[
          { label:"Total",   value:stats.total,    color:"#0a84ff" },
          { label:"Expired", value:stats.expired,  color:"#ff453a" },
          { label:"Soon",    value:stats.critical, color:"#ff9f0a" },
          { label:"Good",    value:stats.good,     color:"#30d158" },
        ].map(s => (
          <div key={s.label} style={{ background:"#1c1c1e", border:`1px solid ${s.color}25`, borderRadius:"14px", padding:"12px", textAlign:"center" }}>
            <div style={{ fontSize:"22px", fontWeight:800, color:s.color, fontFamily:"monospace", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:"11px", color:"#636366", marginTop:"3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Location nav */}
      <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#3a3a3c", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"8px", marginTop:"4px" }}>Locations</div>
      {[{ name:"All", icon:"🏠" }, ...locations].map(loc => {
        const count = loc.name === "All" ? items.length : items.filter(i => i.location === loc.name).length;
        const active = locFilter === loc.name || (loc.name === "All" && locFilter === "All");
        return (
          <button key={loc.name} onClick={() => setLocFilter(loc.name === "All" ? "All" : loc.name)} style={{
            display:"flex", alignItems:"center", gap:"10px", width:"100%",
            padding:"9px 12px", borderRadius:"10px", cursor:"pointer", border:"none",
            background: active ? "rgba(10,132,255,0.15)" : "transparent",
            color: active ? "#0a84ff" : "#8e8e93",
            fontSize:"13px", fontWeight: active ? 600 : 400, textAlign:"left",
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:"15px" }}>{loc.icon}</span>
            <span style={{ flex:1 }}>{loc.name === "All" ? "All Locations" : loc.name}</span>
            <span style={{ fontSize:"11px", color: active ? "#0a84ff" : "#3a3a3c", fontFamily:"monospace" }}>{count}</span>
          </button>
        );
      })}

      <button onClick={() => setShowLocMgr(true)} style={{
        display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px",
        borderRadius:"10px", background:"transparent", border:"1px dashed #2c2c2e",
        color:"#3a3a3c", fontSize:"12px", cursor:"pointer", marginTop:"8px",
        transition:"all 0.15s",
      }}>
        <span>⚙️</span> Manage locations
      </button>
    </div>
  );

  // ── MAIN CONTENT ───────────────────────────────────────────────────
  const MainContent = () => (
    <div style={{ flex:1, minWidth:0 }}>

      {/* Mobile header */}
      {isMobile && (
        <div style={{ marginBottom:"16px" }}>
          <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.16em", color:"#0a84ff", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"4px" }}>🥡 Pantry Tracker</div>
          <h1 style={{ margin:0, fontSize:"26px", fontFamily:"Georgia, serif", fontWeight:800, color:"#fff" }}>The Pantry</h1>
        </div>
      )}

      {/* Mobile stats */}
      {isMobile && (
        <div style={{ display:"flex", gap:"8px", marginBottom:"16px", overflowX:"auto", paddingBottom:"4px" }}>
          {[
            { label:"Total",   value:stats.total,    color:"#0a84ff" },
            { label:"Expired", value:stats.expired,  color:"#ff453a" },
            { label:"Soon",    value:stats.critical, color:"#ff9f0a" },
            { label:"Good",    value:stats.good,     color:"#30d158" },
          ].map(s => (
            <div key={s.label} style={{ background:"#1c1c1e", border:`1px solid ${s.color}25`, borderRadius:"14px", padding:"10px 14px", flexShrink:0, textAlign:"center", minWidth:"60px" }}>
              <div style={{ fontSize:"20px", fontWeight:800, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
              <div style={{ fontSize:"10px", color:"#636366", marginTop:"2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap", alignItems:"center" }}>
        {/* Search */}
        <div style={{ flex:"1 1 180px", position:"relative", minWidth:"140px" }}>
          <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"#3a3a3c", fontSize:"14px", pointerEvents:"none" }}>🔍</span>
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:"100%", background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"12px", padding:"10px 14px 10px 36px", color:"#f5f5f0", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
        </div>

        {/* Category dropdown */}
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...selectStyle, flex:"0 0 auto" }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Location dropdown — mobile only (desktop uses sidebar) */}
        {isMobile && (
          <select value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{ ...selectStyle, flex:"0 0 auto" }}>
            <option value="All">All Locations</option>
            {locations.map(l => <option key={l.name}>{l.name}</option>)}
          </select>
        )}

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...selectStyle, flex:"0 0 auto" }}>
          <option value="expiry">Expiry ↑</option>
          <option value="name">Name A–Z</option>
          <option value="quantity">Qty ↓</option>
          <option value="location">Location</option>
        </select>

        {/* ── ADD BUTTON — prominent ── */}
        <button onClick={() => setModal("new")} style={{
          display:"flex", alignItems:"center", gap:"8px",
          padding:"10px 20px", borderRadius:"12px",
          background:"linear-gradient(135deg, #0a84ff, #0066cc)",
          border:"none", color:"#fff",
          fontSize:"15px", fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 16px rgba(10,132,255,0.4)",
          whiteSpace:"nowrap", flexShrink:0,
          transition:"all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(10,132,255,0.6)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(10,132,255,0.4)"}
        >
          <span style={{ fontSize:"18px", lineHeight:1 }}>+</span>
          <span>Add Item</span>
        </button>

        {/* Manage locations (desktop) */}
        {!isMobile && (
          <button onClick={() => setShowLocMgr(true)} style={{ width:"38px", height:"38px", borderRadius:"10px", background:"#1c1c1e", border:"1px solid #2c2c2e", color:"#636366", fontSize:"16px", cursor:"pointer", flexShrink:0 }} title="Manage locations">⚙️</button>
        )}
      </div>

      {/* Alert banners */}
      {(stats.expired > 0 || stats.critical > 0) && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
          {stats.expired > 0 && (
            <div style={{ background:"rgba(255,69,58,0.1)", border:"1px solid rgba(255,69,58,0.3)", borderRadius:"10px", padding:"8px 14px", fontSize:"13px", fontWeight:600, color:"#ff453a", display:"flex", alignItems:"center", gap:"6px" }}>
              ⚠️ {stats.expired} item{stats.expired > 1 ? "s" : ""} expired
            </div>
          )}
          {stats.critical > 0 && (
            <div style={{ background:"rgba(255,159,10,0.1)", border:"1px solid rgba(255,159,10,0.3)", borderRadius:"10px", padding:"8px 14px", fontSize:"13px", fontWeight:600, color:"#ff9f0a", display:"flex", alignItems:"center", gap:"6px" }}>
              ⏱ {stats.critical} expiring this week
            </div>
          )}
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"80px 20px", color:"#3a3a3c" }}>
          <div style={{ fontSize:"13px", fontFamily:"monospace" }}>Connecting to database…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 20px" }}>
          <div style={{ fontSize:"52px", marginBottom:"16px" }}>🥫</div>
          <div style={{ fontSize:"20px", fontFamily:"Georgia, serif", color:"#636366", marginBottom:"8px" }}>Nothing here</div>
          <div style={{ fontSize:"14px", color:"#3a3a3c" }}>Hit <strong style={{ color:"#0a84ff" }}>+ Add Item</strong> to get started</div>
        </div>
      ) : isMobile ? (
        // ── MOBILE CARDS ──
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {filtered.map(item => {
            const s = STATUS[getStatus(getDays(item.expiry))];
            const accent = item.noExpiry ? "#636366" : s.color;
            return (
              <div key={item.id} style={{ background:"#1c1c1e", borderRadius:"16px", padding:"14px 16px", border:"1px solid #2c2c2e", borderLeft:`4px solid ${accent}`, transition:"all 0.15s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                  <div style={{ flex:1, minWidth:0, paddingRight:"8px" }}>
                    <div style={{ fontWeight:700, fontSize:"16px", color:"#fff", marginBottom:"6px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                      <ExpiryBadge expiry={item.expiry} noExpiry={item.noExpiry} />
                      {item.location && (
                        <span style={{ fontSize:"11px", color:"#8e8e93", background:"#28282c", padding:"3px 8px", borderRadius:"6px", border:"1px solid #3a3a3c" }}>
                          {locIcon(item.location)} {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button onClick={() => setModal(item)} style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#28282c", border:"1px solid #3a3a3c", fontSize:"13px", cursor:"pointer" }}>✏️</button>
                    <button onClick={() => setDeleteConfirm(item.id)} style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#28282c", border:"1px solid #3a3a3c", fontSize:"13px", cursor:"pointer" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"12px", color:"#636366" }}>{item.category}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <button onClick={() => handleQty(item, -1)} style={{ width:"28px", height:"28px", borderRadius:"8px", background:"#28282c", border:"1px solid #3a3a3c", color:"#f5f5f0", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>−</button>
                    <span style={{ fontFamily:"monospace", fontSize:"13px", fontWeight:700, color: item.quantity===0 ? "#ff453a" : "#fff", minWidth:"52px", textAlign:"center" }}>
                      {item.quantity} <span style={{ color:"#636366", fontWeight:400 }}>{item.unit}</span>
                    </span>
                    <button onClick={() => handleQty(item, 1)} style={{ width:"28px", height:"28px", borderRadius:"8px", background:"#28282c", border:"1px solid #3a3a3c", color:"#f5f5f0", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>+</button>
                  </div>
                </div>
                {item.notes && <div style={{ fontSize:"12px", color:"#48484a", marginTop:"8px", fontStyle:"italic" }}>{item.notes}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        // ── DESKTOP TABLE ──
        <div style={{ background:"#141416", borderRadius:"16px", border:"1px solid #1e1e20", overflow:"hidden" }}>
          {/* Table header */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 110px 120px 150px 90px", gap:"0", padding:"10px 20px", background:"#0d0d0f", borderBottom:"1px solid #1e1e20" }}>
            {["Item","Quantity","Expires","Category","Location",""].map((h, i) => (
              <div key={i} style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#3a3a3c", textTransform:"uppercase", fontFamily:"monospace" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((item, idx) => {
            const days = getDays(item.expiry);
            const s = STATUS[getStatus(days)];
            const accent = item.noExpiry ? "#636366" : s.color;
            return (
              <div key={item.id}
                style={{ display:"grid", gridTemplateColumns:"1fr 140px 110px 120px 150px 90px", gap:"0", alignItems:"center", padding:"12px 20px", borderBottom: idx < filtered.length-1 ? "1px solid #1a1a1c" : "none", borderLeft:`3px solid ${accent}`, transition:"background 0.1s", cursor:"default" }}
                onMouseEnter={e => e.currentTarget.style.background="#1a1a1c"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>

                <div style={{ paddingRight:"16px" }}>
                  <div style={{ fontWeight:600, fontSize:"14px", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize:"11px", color:"#48484a", marginTop:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.notes}</div>}
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <button onClick={() => handleQty(item,-1)} style={{ width:"22px", height:"22px", borderRadius:"6px", background:"#28282c", border:"1px solid #2c2c2e", color:"#f5f5f0", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, flexShrink:0 }}>−</button>
                  <span style={{ fontFamily:"monospace", fontSize:"12px", fontWeight:600, color: item.quantity===0 ? "#ff453a" : "#fff", minWidth:"44px", textAlign:"center" }}>
                    {item.quantity}<span style={{ color:"#48484a" }}> {item.unit}</span>
                  </span>
                  <button onClick={() => handleQty(item,1)} style={{ width:"22px", height:"22px", borderRadius:"6px", background:"#28282c", border:"1px solid #2c2c2e", color:"#f5f5f0", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, flexShrink:0 }}>+</button>
                </div>

                <div>
                  <ExpiryBadge expiry={item.expiry} noExpiry={item.noExpiry} />
                  {!item.noExpiry && item.expiry && (
                    <div style={{ fontSize:"10px", color:"#3a3a3c", marginTop:"3px", fontFamily:"monospace" }}>
                      {new Date(item.expiry).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                  )}
                </div>

                <div style={{ fontSize:"12px", color:"#636366", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.category}</div>

                <div style={{ fontSize:"12px", color:"#8e8e93", display:"flex", alignItems:"center", gap:"5px", overflow:"hidden" }}>
                  <span style={{ flexShrink:0 }}>{locIcon(item.location)}</span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.location}</span>
                </div>

                <div style={{ display:"flex", gap:"5px", justifyContent:"flex-end" }}>
                  <button onClick={() => setModal(item)} style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#28282c", border:"1px solid #2c2c2e", fontSize:"13px", cursor:"pointer" }}>✏️</button>
                  <button onClick={() => setDeleteConfirm(item.id)} style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#28282c", border:"1px solid #2c2c2e", fontSize:"13px", cursor:"pointer" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign:"center", marginTop:"20px", fontSize:"11px", color:"#3a3a3c", fontFamily:"monospace", paddingBottom:"40px" }}>
        {filtered.length} of {items.length} items · {syncing ? "saving…" : "live ●"}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", fontFamily:"'Helvetica Neue', Arial, sans-serif", color:"#f5f5f0" }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.4); }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#2c2c2e; border-radius:4px; }
        select option { background:#1c1c1e; }
        input::placeholder { color:#3a3a3c; }
        @keyframes slideUp {
          from { opacity:0; transform:translateX(-50%) translateY(10px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding: isMobile ? "24px 16px" : "40px 32px" }}>
        <div style={{ display:"flex", gap: isMobile ? "0" : "32px" }}>
          {!isMobile && <Sidebar />}
          <MainContent />
        </div>
      </div>

      {modal !== null && (
        <ItemModal item={modal === "new" ? null : modal} locations={locations} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {showLocMgr && (
        <LocationManager locations={locations} onSave={saveLocations} onClose={() => setShowLocMgr(false)} />
      )}
      {deleteConfirm !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"20px", padding:"28px", maxWidth:"300px", width:"100%", textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:"36px", marginBottom:"12px" }}>🗑</div>
            <div style={{ fontFamily:"Georgia, serif", fontSize:"18px", marginBottom:"8px", color:"#fff" }}>Remove item?</div>
            <div style={{ fontSize:"13px", color:"#636366", marginBottom:"24px" }}>This removes it for both of you.</div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex:1, padding:"12px", borderRadius:"12px", background:"#28282c", border:"none", color:"#8e8e93", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex:1, padding:"12px", borderRadius:"12px", background:"#ff453a", border:"none", color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
