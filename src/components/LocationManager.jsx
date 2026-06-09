// src/components/LocationManager.jsx
import { useState } from "react";

const LOCATION_ICONS = ["🗄","📦","🍳","🔄","🏠","🥤","❄️","🧊","🥡","🪣","🛒","📋"];

export default function LocationManager({ locations, onSave, onClose }) {
  const [list, setList] = useState(locations.map((l, i) => ({ id: i, ...l })));
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🗄");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  function addLocation() {
    if (!newName.trim()) return;
    setList(prev => [...prev, { id: Date.now(), name: newName.trim(), icon: newIcon }]);
    setNewName("");
    setNewIcon("🗄");
  }

  function removeLocation(id) {
    setList(prev => prev.filter(l => l.id !== id));
  }

  function startEdit(loc) {
    setEditingId(loc.id);
    setEditName(loc.name);
  }

  function saveEdit(id) {
    if (!editName.trim()) return;
    setList(prev => prev.map(l => l.id === id ? { ...l, name: editName.trim() } : l));
    setEditingId(null);
  }

  function changeIcon(id, icon) {
    setList(prev => prev.map(l => l.id === id ? { ...l, icon } : l));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "24px", padding: "28px", width: "100%", maxWidth: "480px", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", margin: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "4px" }}>Settings</div>
            <h2 style={{ margin: 0, fontSize: "20px", fontFamily: "Georgia, serif", color: "#f5f5f0", fontWeight: 700 }}>Manage Locations</h2>
          </div>
          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#2c2c2e", border: "1px solid #3a3a3c", color: "#f5f5f0", fontSize: "16px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Existing locations */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px", maxHeight: "320px", overflowY: "auto" }}>
          {list.map(loc => (
            <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#28282c", borderRadius: "12px", border: "1px solid #3a3a3c" }}>
              {/* Icon picker */}
              <select
                value={loc.icon}
                onChange={e => changeIcon(loc.id, e.target.value)}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", outline: "none", width: "32px", colorScheme: "dark" }}
              >
                {LOCATION_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>

              {/* Name — editable inline */}
              {editingId === loc.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(loc.id); if (e.key === "Escape") setEditingId(null); }}
                  style={{ flex: 1, background: "#3a3a3c", border: "1px solid #c8a96e", borderRadius: "8px", padding: "6px 10px", color: "#f5f5f0", fontSize: "14px", outline: "none" }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "#f5f5f0" }}>{loc.name}</span>
              )}

              {editingId === loc.id ? (
                <button onClick={() => saveEdit(loc.id)} style={{ background: "#c8a96e", border: "none", borderRadius: "8px", padding: "5px 10px", color: "#111", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Save</button>
              ) : (
                <button onClick={() => startEdit(loc)} style={{ background: "#2c2c2e", border: "none", borderRadius: "8px", padding: "5px 10px", color: "#8e8e93", fontSize: "12px", cursor: "pointer" }}>Edit</button>
              )}
              <button onClick={() => removeLocation(loc.id)} style={{ background: "transparent", border: "none", color: "#ff3b30", fontSize: "16px", cursor: "pointer", padding: "4px" }}>🗑</button>
            </div>
          ))}
        </div>

        {/* Add new location */}
        <div style={{ background: "#28282c", borderRadius: "14px", padding: "14px", border: "1px solid #3a3a3c", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#8e8e93", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "10px" }}>Add new location</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select value={newIcon} onChange={e => setNewIcon(e.target.value)} style={{ background: "#3a3a3c", border: "1px solid #48484a", borderRadius: "8px", padding: "9px 6px", fontSize: "18px", cursor: "pointer", outline: "none", colorScheme: "dark" }}>
              {LOCATION_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
              type="text"
              placeholder="Location name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addLocation()}
              style={{ flex: 1, background: "#3a3a3c", border: "1px solid #48484a", borderRadius: "8px", padding: "9px 12px", color: "#f5f5f0", fontSize: "14px", outline: "none" }}
            />
            <button onClick={addLocation} disabled={!newName.trim()} style={{ padding: "9px 14px", borderRadius: "8px", background: newName.trim() ? "#c8a96e" : "#3a3a3c", border: "none", color: newName.trim() ? "#111" : "#48484a", fontSize: "14px", fontWeight: 700, cursor: newName.trim() ? "pointer" : "default", transition: "all 0.15s" }}>Add</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#2c2c2e", border: "none", color: "#8e8e93", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(list)} style={{ flex: 2, padding: "12px", borderRadius: "12px", background: "#c8a96e", border: "none", color: "#111", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>Save Locations</button>
        </div>
      </div>
    </div>
  );
}
