// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { subscribeToItems, addItem, updateItem, deleteItem } from "./db";
import ItemModal from "./components/ItemModal";

const CATEGORIES = ["All", "Grains & Pasta", "Canned Goods", "Spices & Condiments", "Snacks", "Baking", "Beverages", "Frozen", "Produce", "Dairy", "Other"];
const LOCATIONS  = ["All Locations", "Pantry", "Basement Shelf", "Kitchen", "Lazy Susan", "Garage", "Drink Fridge", "Mini Fridge", "Kitchen Fridge"];

const LOCATION_ICONS = {
  "Pantry": "🗄", "Basement Shelf": "📦", "Kitchen": "🍳",
  "Lazy Susan": "🔄", "Garage": "🏠", "Drink Fridge": "🥤",
  "Mini Fridge": "❄️", "Kitchen Fridge": "🧊",
};

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

function ExpiryBadge({ expiry }) {
  const days = getDays(expiry);
  const status = getStatus(days);
  const cfg = {
    expired:  { label: "Expired",      color: "#ff3b30", bg: "#ff3b3015" },
    critical: { label: `${days}d left`, color: "#ff9500", bg: "#ff950015" },
    warning:  { label: `${days}d left`, color: "#f5c518", bg: "#f5c51815" },
    good:     { label: `${days}d left`, color: "#34c759", bg: "#34c75915" },
    none:     { label: "No expiry",     color: "#8e8e93", bg: "#8e8e9315" },
  }[status];
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, fontFamily: "monospace", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function LocationBadge({ location }) {
  if (!location) return null;
  return (
    <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", color: "#a0a0ab", background: "#28282c", border: "1px solid #3a3a3c", fontFamily: "monospace", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "10px" }}>{LOCATION_ICONS[location] || "📍"}</span>{location}
    </span>
  );
}

export default function App() {
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [location, setLocation]       = useState("All Locations");
  const [sort, setSort]               = useState("expiry");
  const [modal, setModal]             = useState(null); // null | "new" | item
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [syncing, setSyncing]         = useState(false);

  // Real-time Firebase subscription
  useEffect(() => {
    const unsub = subscribeToItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub; // unsubscribes on unmount
  }, []);

  async function handleSave(form) {
    setSyncing(true);
    try {
      if (modal === "new") {
        await addItem(form);
      } else {
        await updateItem(modal.id, form);
      }
    } finally {
      setSyncing(false);
      setModal(null);
    }
  }

  async function handleDelete(id) {
    setSyncing(true);
    try {
      await deleteItem(id);
    } finally {
      setSyncing(false);
      setDeleteConfirm(null);
    }
  }

  async function handleQtyChange(item, delta) {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    await updateItem(item.id, { ...item, quantity: newQty });
  }

  const filtered = useMemo(() => {
    let list = items.filter(i =>
      (category === "All" || i.category === category) &&
      (location === "All Locations" || i.location === location) &&
      [i.name, i.category, i.location, i.notes].some(f =>
        (f || "").toLowerCase().includes(search.toLowerCase())
      )
    );
    if (sort === "name")     list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    if (sort === "quantity") list = [...list].sort((a,b) => b.quantity - a.quantity);
    if (sort === "location") list = [...list].sort((a,b) => (a.location||"").localeCompare(b.location||""));
    // expiry sort is done in db.js already
    return list;
  }, [items, category, location, search, sort]);

  const stats = useMemo(() => ({
    expired:  items.filter(i => getStatus(getDays(i.expiry)) === "expired").length,
    critical: items.filter(i => getStatus(getDays(i.expiry)) === "critical").length,
    warning:  items.filter(i => getStatus(getDays(i.expiry)) === "warning").length,
  }), [items]);

  return (
    <div style={{ minHeight: "100vh", background: "#111113", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#f5f5f0" }}>
      <style>{`
        * { box-sizing: border-box; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #3a3a3c; border-radius: 4px; }
        .row:hover { background: #1f1f21 !important; }
        .ibtn:hover { background: #3a3a3c !important; }
        select option { background: #1c1c1e; }
        @media (max-width: 600px) {
          .desktop-col { display: none !important; }
          .grid-row { grid-template-columns: 1fr 100px 110px 80px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "env(safe-area-inset-top, 48px) 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "6px" }}>
              Kitchen Management
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 6vw, 40px)", fontFamily: "Georgia, serif", fontWeight: 800, lineHeight: 1.1, color: "#f5f5f0" }}>
              The Pantry
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
            {syncing && <span style={{ fontSize: "11px", color: "#6e6e73", fontFamily: "monospace" }}>saving…</span>}
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: loading ? "#f5c518" : "#34c759", title: loading ? "Connecting…" : "Live" }} title={loading ? "Connecting…" : "Live sync active"} />
            <button onClick={() => setModal("new")} style={{
              background: "#c8a96e", border: "none", borderRadius: "14px",
              padding: "11px 18px", color: "#111113", fontSize: "14px",
              fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> Add
            </button>
          </div>
        </div>

        {/* Alert strip */}
        {(stats.expired > 0 || stats.critical > 0 || stats.warning > 0) && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
            {stats.expired  > 0 && <div style={{ background: "#ff3b3015", border: "1px solid #ff3b3040", borderRadius: "20px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#ff3b30", fontFamily: "monospace" }}>⚠ {stats.expired} expired</div>}
            {stats.critical > 0 && <div style={{ background: "#ff950015", border: "1px solid #ff950040", borderRadius: "20px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#ff9500", fontFamily: "monospace" }}>⏱ {stats.critical} expiring this week</div>}
            {stats.warning  > 0 && <div style={{ background: "#f5c51815", border: "1px solid #f5c51840", borderRadius: "20px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#f5c518", fontFamily: "monospace" }}>📅 {stats.warning} expiring this month</div>}
          </div>
        )}

        {/* Search + Sort */}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
          <input type="text" placeholder="Search items, locations…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: "1 1 200px", background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "12px", padding: "10px 16px", color: "#f5f5f0", fontSize: "14px", outline: "none" }}
          />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "12px", padding: "10px 14px", color: "#f5f5f0", fontSize: "14px", outline: "none", colorScheme: "dark" }}>
            <option value="expiry">Sort: Expiry</option>
            <option value="name">Sort: Name</option>
            <option value="quantity">Sort: Quantity</option>
            <option value="location">Sort: Location</option>
          </select>
        </div>

        {/* Location tabs */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#48484a", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "7px" }}>Location</div>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {LOCATIONS.map(loc => (
              <button key={loc} onClick={() => setLocation(loc)} style={{
                background: location === loc ? "#4a90d9" : "#1c1c1e",
                border: `1px solid ${location === loc ? "#4a90d9" : "#2c2c2e"}`,
                borderRadius: "20px", padding: "6px 12px",
                color: location === loc ? "#fff" : "#8e8e93",
                fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                {loc !== "All Locations" && <span style={{ fontSize: "11px" }}>{LOCATION_ICONS[loc]}</span>}
                {loc === "All Locations" ? "All" : loc}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#48484a", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "7px" }}>Category</div>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                background: category === cat ? "#c8a96e" : "#1c1c1e",
                border: `1px solid ${category === cat ? "#c8a96e" : "#2c2c2e"}`,
                borderRadius: "20px", padding: "6px 12px",
                color: category === cat ? "#111113" : "#8e8e93",
                fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ maxWidth: "980px", margin: "16px auto 80px", padding: "0 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#48484a" }}>
            <div style={{ fontSize: "13px", fontFamily: "monospace" }}>Connecting to database…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🥫</div>
            <div style={{ fontSize: "20px", fontFamily: "Georgia, serif", color: "#6e6e73", marginBottom: "8px" }}>Nothing here yet</div>
            <div style={{ fontSize: "14px", color: "#48484a" }}>Tap + Add or scan a barcode to get started</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* Column headers */}
            <div className="grid-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 110px 120px 80px", gap: "10px", padding: "8px 16px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#48484a", textTransform: "uppercase", fontFamily: "monospace" }}>
              <span>Item</span><span>Quantity</span><span>Expires</span>
              <span className="desktop-col">Category</span>
              <span>Location</span><span></span>
            </div>

            {filtered.map(item => {
              const days = getDays(item.expiry);
              const status = getStatus(days);
              const accent = { expired: "#ff3b30", critical: "#ff9500", warning: "#f5c518", good: "#34c759", none: "#48484a" }[status];

              return (
                <div key={item.id} className="row grid-row" style={{
                  display: "grid", gridTemplateColumns: "1fr 120px 110px 110px 120px 80px",
                  gap: "10px", alignItems: "center", padding: "13px 16px",
                  borderRadius: "14px", background: "#141416",
                  transition: "background 0.15s", borderLeft: `3px solid ${accent}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#f5f5f0" }}>{item.name}</div>
                    {item.notes && <div style={{ fontSize: "11px", color: "#6e6e73", marginTop: "2px" }}>{item.notes}</div>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button className="ibtn" onClick={() => handleQtyChange(item, -1)} style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#2c2c2e", border: "none", color: "#f5f5f0", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, minWidth: "36px", textAlign: "center", color: item.quantity === 0 ? "#ff3b30" : "#f5f5f0" }}>
                      {item.quantity} <span style={{ color: "#6e6e73", fontWeight: 400 }}>{item.unit}</span>
                    </span>
                    <button className="ibtn" onClick={() => handleQtyChange(item, 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#2c2c2e", border: "none", color: "#f5f5f0", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>

                  <div>
                    <ExpiryBadge expiry={item.expiry} />
                    {item.expiry && <div style={{ fontSize: "10px", color: "#48484a", marginTop: "3px", fontFamily: "monospace" }}>
                      {new Date(item.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>}
                  </div>

                  <div className="desktop-col" style={{ fontSize: "11px", color: "#6e6e73" }}>{item.category}</div>

                  <LocationBadge location={item.location} />

                  <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                    <button className="ibtn" onClick={() => setModal(item)} style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#2c2c2e", border: "none", color: "#8e8e93", fontSize: "13px", cursor: "pointer" }}>✏️</button>
                    <button className="ibtn" onClick={() => setDeleteConfirm(item.id)} style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#2c2c2e", border: "none", color: "#ff3b30", fontSize: "13px", cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "#3a3a3c", fontFamily: "monospace" }}>
          {filtered.length} of {items.length} items · live sync active
        </div>
      </div>

      {/* Modals */}
      {modal !== null && (
        <ItemModal item={modal === "new" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "20px", padding: "28px", maxWidth: "300px", width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🗑</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", marginBottom: "8px" }}>Remove item?</div>
            <div style={{ fontSize: "13px", color: "#6e6e73", marginBottom: "24px" }}>This will delete it for both of you.</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "#2c2c2e", border: "none", color: "#8e8e93", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "#ff3b30", border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
