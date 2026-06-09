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

const CATEGORIES = ["All","Grains & Pasta","Canned Goods","Spices & Condiments","Snacks","Baking","Beverages","Frozen","Produce","Dairy","Other"];

function getDays(expiry) {
  if (!expiry) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(expiry) - today) / 86400000);
}
function getStatus(days) {
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "good";
}
const STATUS_COLOR = { expired:"#ff3b30", critical:"#ff9500", warning:"#f5c518", good:"#34c759", none:"#3a3a3c" };
const STATUS_BG    = { expired:"#ff3b3015", critical:"#ff950015", warning:"#f5c51815", good:"#34c75915", none:"#3a3a3c20" };
const STATUS_LABEL = { expired:"Expired", critical:"This week", warning:"This month", good:"Good", none:"No expiry" };

function ExpiryBadge({ expiry }) {
  const days = getDays(expiry);
  const s = getStatus(days);
  const label = s === "good" || s === "none" ? STATUS_LABEL[s] : (days < 0 ? "Expired" : `${days}d left`);
  return (
    <span style={{ fontSize:"11px", fontWeight:600, padding:"3px 9px", borderRadius:"20px", color:STATUS_COLOR[s], background:STATUS_BG[s], border:`1px solid ${STATUS_COLOR[s]}35`, fontFamily:"monospace", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:"#1c1c1e", border:`1px solid ${color}30`, borderRadius:"16px", padding:"16px 20px", flex:1, minWidth:"100px" }}>
      <div style={{ fontSize:"28px", fontWeight:800, color, fontFamily:"monospace", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:"12px", color:"#6e6e73", marginTop:"4px", fontWeight:500 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("All");
  const [locFilter, setLocFilter]   = useState("All");
  const [sort, setSort]             = useState("expiry");
  const [modal, setModal]           = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLocMgr, setShowLocMgr] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);

  const [locations, setLocations]   = useState(() => {
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

  function saveLocations(list) {
    setLocations(list);
    localStorage.setItem("pantry-locations", JSON.stringify(list));
    setShowLocMgr(false);
  }

  async function handleSave(form) {
    setSyncing(true);
    try {
      if (modal === "new") await addItem(form);
      else await updateItem(modal.id, form);
    } finally { setSyncing(false); setModal(null); }
  }

  async function handleDelete(id) {
    setSyncing(true);
    try { await deleteItem(id); }
    finally { setSyncing(false); setDeleteConfirm(null); }
  }

  async function handleQty(item, delta) {
    await updateItem(item.id, { ...item, quantity: Math.max(0, (item.quantity||0) + delta) });
  }

  const filtered = useMemo(() => {
    let list = items.filter(i =>
      (category === "All" || i.category === category) &&
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
    expired:  items.filter(i => getStatus(getDays(i.expiry)) === "expired").length,
    critical: items.filter(i => getStatus(getDays(i.expiry)) === "critical").length,
    warning:  items.filter(i => getStatus(getDays(i.expiry)) === "warning").length,
    good:     items.filter(i => getStatus(getDays(i.expiry)) === "good").length,
  }), [items]);

  const locIcon = name => locations.find(l => l.name === name)?.icon || "📍";

  // ── SIDEBAR (desktop) ──────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{ width:"260px", flexShrink:0, display:"flex", flexDirection:"column", gap:"8px", paddingRight:"24px", borderRight:"1px solid #1e1e20" }}>
      <div style={{ marginBottom:"8px" }}>
        <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#c8a96e", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"16px" }}>Kitchen Management</div>
        <h1 style={{ margin:0, fontSize:"32px", fontFamily:"Georgia, serif", fontWeight:800, color:"#f5f5f0", lineHeight:1.1 }}>The Pantry</h1>
        <div style={{ fontSize:"13px", color:"#6e6e73", marginTop:"6px" }}>{items.length} items tracked</div>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"8px" }}>
        {[
          { label:"Total Items",    value:stats.total,    color:"#c8a96e" },
          { label:"Expired",        value:stats.expired,  color:"#ff3b30" },
          { label:"Expiring Soon",  value:stats.critical, color:"#ff9500" },
          { label:"Good",           value:stats.good,     color:"#34c759" },
        ].map(s => (
          <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#1c1c1e", borderRadius:"12px", border:`1px solid ${s.color}20` }}>
            <span style={{ fontSize:"13px", color:"#8e8e93" }}>{s.label}</span>
            <span style={{ fontSize:"16px", fontWeight:700, color:s.color, fontFamily:"monospace" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Location filter */}
      <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:"#48484a", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"6px", marginTop:"8px" }}>Locations</div>
      {["All", ...locations.map(l => l.name)].map(loc => (
        <button key={loc} onClick={() => setLocFilter(loc)} style={{
          display:"flex", alignItems:"center", gap:"10px", width:"100%",
          padding:"10px 14px", borderRadius:"12px", cursor:"pointer", transition:"all 0.15s",
          background: locFilter === loc ? "#c8a96e15" : "transparent",
          border: locFilter === loc ? "1px solid #c8a96e40" : "1px solid transparent",
          color: locFilter === loc ? "#c8a96e" : "#8e8e93",
          fontSize:"14px", fontWeight: locFilter === loc ? 600 : 400, textAlign:"left",
        }}>
          <span style={{ fontSize:"16px" }}>{loc === "All" ? "🏠" : locIcon(loc)}</span>
          <span>{loc === "All" ? "All Locations" : loc}</span>
          {loc !== "All" && (
            <span style={{ marginLeft:"auto", fontSize:"11px", color:"#48484a", fontFamily:"monospace" }}>
              {items.filter(i => i.location === loc).length}
            </span>
          )}
        </button>
      ))}

      <button onClick={() => setShowLocMgr(true)} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", borderRadius:"12px", background:"transparent", border:"1px dashed #3a3a3c", color:"#48484a", fontSize:"13px", cursor:"pointer", marginTop:"4px", transition:"all 0.15s" }}>
        <span>⚙️</span> Manage locations
      </button>
    </div>
  );

  // ── MAIN CONTENT ───────────────────────────────────────────────────
  const MainContent = () => (
    <div style={{ flex:1, minWidth:0 }}>
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px", flexWrap:"wrap" }}>
        {isMobile && (
          <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
            <div>
              <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#c8a96e", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"4px" }}>Kitchen Management</div>
              <h1 style={{ margin:0, fontSize:"26px", fontFamily:"Georgia, serif", fontWeight:800, color:"#f5f5f0" }}>The Pantry</h1>
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <button onClick={() => setShowLocMgr(true)} style={{ width:"36px", height:"36px", borderRadius:"10px", background:"#1c1c1e", border:"1px solid #2c2c2e", color:"#8e8e93", fontSize:"16px", cursor:"pointer" }}>⚙️</button>
              <button onClick={() => setModal("new")} style={{ height:"36px", padding:"0 16px", borderRadius:"10px", background:"#c8a96e", border:"none", color:"#111", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>+ Add</button>
            </div>
          </div>
        )}

        {/* Mobile stats strip */}
        {isMobile && (
          <div style={{ display:"flex", gap:"8px", width:"100%", overflowX:"auto", paddingBottom:"4px" }}>
            {[
              { label:"Total", value:stats.total, color:"#c8a96e" },
              { label:"Expired", value:stats.expired, color:"#ff3b30" },
              { label:"Soon", value:stats.critical, color:"#ff9500" },
              { label:"Good", value:stats.good, color:"#34c759" },
            ].map(s => (
              <div key={s.label} style={{ background:"#1c1c1e", border:`1px solid ${s.color}25`, borderRadius:"12px", padding:"10px 14px", flexShrink:0, textAlign:"center", minWidth:"64px" }}>
                <div style={{ fontSize:"20px", fontWeight:800, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                <div style={{ fontSize:"10px", color:"#6e6e73", marginTop:"2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + sort */}
        <div style={{ display:"flex", gap:"8px", width:"100%", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 200px", position:"relative" }}>
            <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"#48484a", fontSize:"14px" }}>🔍</span>
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:"100%", background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"12px", padding:"10px 14px 10px 36px", color:"#f5f5f0", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"12px", padding:"10px 14px", color:"#f5f5f0", fontSize:"14px", outline:"none", colorScheme:"dark" }}>
            <option value="expiry">Expiry</option>
            <option value="name">Name A–Z</option>
            <option value="quantity">Quantity</option>
            <option value="location">Location</option>
          </select>
          {!isMobile && (
            <button onClick={() => setModal("new")} style={{ padding:"10px 20px", borderRadius:"12px", background:"#c8a96e", border:"none", color:"#111", fontSize:"14px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>+ Add Item</button>
          )}
        </div>

        {/* Category tabs */}
        <div style={{ display:"flex", gap:"6px", width:"100%", overflowX:"auto", paddingBottom:"2px" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              background: category === cat ? "#c8a96e" : "#1c1c1e",
              border:`1px solid ${category === cat ? "#c8a96e" : "#2c2c2e"}`,
              borderRadius:"20px", padding:"5px 12px",
              color: category === cat ? "#111" : "#6e6e73",
              fontSize:"12px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
            }}>{cat}</button>
          ))}
        </div>

        {/* Mobile location tabs */}
        {isMobile && (
          <div style={{ display:"flex", gap:"6px", width:"100%", overflowX:"auto", paddingBottom:"2px" }}>
            {["All", ...locations.map(l => l.name)].map(loc => (
              <button key={loc} onClick={() => setLocFilter(loc)} style={{
                background: locFilter === loc ? "#4a90d915" : "#1c1c1e",
                border:`1px solid ${locFilter === loc ? "#4a90d9" : "#2c2c2e"}`,
                borderRadius:"20px", padding:"5px 12px",
                color: locFilter === loc ? "#4a90d9" : "#6e6e73",
                fontSize:"12px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                display:"flex", alignItems:"center", gap:"4px",
              }}>
                <span>{loc === "All" ? "🏠" : locIcon(loc)}</span>
                <span>{loc === "All" ? "All" : loc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#48484a" }}>
          <div style={{ fontSize:"13px", fontFamily:"monospace" }}>Connecting…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 20px" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>🥫</div>
          <div style={{ fontSize:"20px", fontFamily:"Georgia, serif", color:"#6e6e73", marginBottom:"8px" }}>Nothing here</div>
          <div style={{ fontSize:"14px", color:"#48484a" }}>Tap + Add or scan a barcode to get started</div>
        </div>
      ) : isMobile ? (
        // ── MOBILE CARD VIEW ──
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map(item => {
            const days = getDays(item.expiry);
            const s = getStatus(days);
            return (
              <div key={item.id} style={{ background:"#1c1c1e", borderRadius:"16px", padding:"14px 16px", border:"1px solid #2c2c2e", borderLeft:`4px solid ${STATUS_COLOR[s]}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:"16px", color:"#f5f5f0", marginBottom:"4px" }}>{item.name}</div>
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
                      <ExpiryBadge expiry={item.expiry} />
                      {item.location && (
                        <span style={{ fontSize:"11px", color:"#6e6e73", background:"#28282c", padding:"2px 8px", borderRadius:"6px", border:"1px solid #3a3a3c" }}>
                          {locIcon(item.location)} {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                    <button onClick={() => setModal(item)} style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#2c2c2e", border:"none", fontSize:"13px", cursor:"pointer" }}>✏️</button>
                    <button onClick={() => setDeleteConfirm(item.id)} style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#2c2c2e", border:"none", fontSize:"13px", cursor:"pointer" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:"12px", color:"#6e6e73" }}>{item.category}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <button onClick={() => handleQty(item, -1)} style={{ width:"28px", height:"28px", borderRadius:"8px", background:"#2c2c2e", border:"1px solid #3a3a3c", color:"#f5f5f0", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontFamily:"monospace", fontSize:"13px", fontWeight:700, color: item.quantity===0 ? "#ff3b30" : "#f5f5f0", minWidth:"50px", textAlign:"center" }}>
                      {item.quantity} {item.unit}
                    </span>
                    <button onClick={() => handleQty(item, 1)} style={{ width:"28px", height:"28px", borderRadius:"8px", background:"#2c2c2e", border:"1px solid #3a3a3c", color:"#f5f5f0", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                </div>
                {item.notes && <div style={{ fontSize:"12px", color:"#48484a", marginTop:"8px", fontStyle:"italic" }}>{item.notes}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        // ── DESKTOP TABLE VIEW ──
        <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 130px 120px 110px 140px 90px", gap:"12px", padding:"8px 16px", fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:"#48484a", textTransform:"uppercase", fontFamily:"monospace" }}>
            <span>Item</span><span>Quantity</span><span>Expires</span><span>Category</span><span>Location</span><span></span>
          </div>
          {filtered.map(item => {
            const days = getDays(item.expiry);
            const s = getStatus(days);
            return (
              <div key={item.id} style={{ display:"grid", gridTemplateColumns:"1fr 130px 120px 110px 140px 90px", gap:"12px", alignItems:"center", padding:"13px 16px", borderRadius:"14px", background:"#141416", transition:"background 0.15s", borderLeft:`3px solid ${STATUS_COLOR[s]}`, cursor:"default" }}
                onMouseEnter={e => e.currentTarget.style.background="#1a1a1c"}
                onMouseLeave={e => e.currentTarget.style.background="#141416"}>
                <div>
                  <div style={{ fontWeight:600, fontSize:"14px", color:"#f5f5f0" }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize:"11px", color:"#6e6e73", marginTop:"2px" }}>{item.notes}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <button onClick={() => handleQty(item, -1)} style={{ width:"24px", height:"24px", borderRadius:"6px", background:"#2c2c2e", border:"none", color:"#f5f5f0", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontFamily:"monospace", fontSize:"12px", fontWeight:600, minWidth:"42px", textAlign:"center", color: item.quantity===0 ? "#ff3b30" : "#f5f5f0" }}>{item.quantity} <span style={{ color:"#6e6e73", fontWeight:400 }}>{item.unit}</span></span>
                  <button onClick={() => handleQty(item, 1)} style={{ width:"24px", height:"24px", borderRadius:"6px", background:"#2c2c2e", border:"none", color:"#f5f5f0", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
                <div>
                  <ExpiryBadge expiry={item.expiry} />
                  {item.expiry && <div style={{ fontSize:"10px", color:"#48484a", marginTop:"3px", fontFamily:"monospace" }}>{new Date(item.expiry).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>}
                </div>
                <div style={{ fontSize:"11px", color:"#6e6e73" }}>{item.category}</div>
                <div style={{ fontSize:"12px", color:"#8e8e93", display:"flex", alignItems:"center", gap:"5px" }}>
                  <span>{locIcon(item.location)}</span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.location}</span>
                </div>
                <div style={{ display:"flex", gap:"5px", justifyContent:"flex-end" }}>
                  <button onClick={() => setModal(item)} style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#2c2c2e", border:"none", fontSize:"13px", cursor:"pointer" }}>✏️</button>
                  <button onClick={() => setDeleteConfirm(item.id)} style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#2c2c2e", border:"none", fontSize:"13px", cursor:"pointer" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign:"center", marginTop:"24px", fontSize:"11px", color:"#3a3a3c", fontFamily:"monospace", paddingBottom:"40px" }}>
        {filtered.length} of {items.length} items · {syncing ? "saving…" : "live sync ●"}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", fontFamily:"'Helvetica Neue', Arial, sans-serif", color:"#f5f5f0" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3c; border-radius: 4px; }
        select option { background: #1c1c1e; }
        input::placeholder { color: #48484a; }
      `}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding: isMobile ? "24px 16px" : "40px 32px" }}>
        <div style={{ display:"flex", gap:"32px" }}>
          {!isMobile && <Sidebar />}
          <MainContent />
        </div>
      </div>

      {modal !== null && (
        <ItemModal
          item={modal === "new" ? null : modal}
          locations={locations}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {showLocMgr && (
        <LocationManager
          locations={locations}
          onSave={saveLocations}
          onClose={() => setShowLocMgr(false)}
        />
      )}

      {deleteConfirm !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"20px", padding:"28px", maxWidth:"300px", width:"100%", textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>🗑</div>
            <div style={{ fontFamily:"Georgia, serif", fontSize:"18px", marginBottom:"8px", color:"#f5f5f0" }}>Remove item?</div>
            <div style={{ fontSize:"13px", color:"#6e6e73", marginBottom:"24px" }}>Removes it for both of you.</div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex:1, padding:"11px", borderRadius:"12px", background:"#2c2c2e", border:"none", color:"#8e8e93", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex:1, padding:"11px", borderRadius:"12px", background:"#ff3b30", border:"none", color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
