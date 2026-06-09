// src/components/ItemModal.jsx
import { useState } from "react";
import { lookupBarcode } from "../barcodeLookup";
import BarcodeScanner from "./BarcodeScanner";

const CATEGORIES = ["Grains & Pasta", "Canned Goods", "Spices & Condiments", "Snacks", "Baking", "Beverages", "Frozen", "Produce", "Dairy", "Other"];
const LOCATIONS  = ["Pantry", "Basement Shelf", "Kitchen", "Lazy Susan", "Garage", "Drink Fridge", "Mini Fridge", "Kitchen Fridge"];

const EMPTY = { name: "", category: "Other", quantity: 1, unit: "units", expiry: "", location: "Pantry", notes: "" };

export default function ItemModal({ item, onSave, onClose }) {
  const [form, setForm]         = useState(item || EMPTY);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking]   = useState(false);
  const [lookupMsg, setLookupMsg] = useState(null); // { type: "success"|"error", text }
  const [productImg, setProductImg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleBarcode(barcode) {
    setScanning(false);
    setLooking(true);
    setLookupMsg(null);

    const result = await lookupBarcode(barcode);
    setLooking(false);

    if (result.found) {
      setForm(f => ({
        ...f,
        name:     result.name || f.name,
        category: result.category || f.category,
      }));
      if (result.imageUrl) setProductImg(result.imageUrl);
      setLookupMsg({ type: "success", text: `Found: ${result.name}${result.brand ? ` by ${result.brand}` : ""}` });
    } else {
      setLookupMsg({ type: "error", text: `Barcode ${barcode} not found — fill in details manually.` });
    }
  }

  const labelStyle = {
    display: "block", fontSize: "11px", fontWeight: 600,
    letterSpacing: "0.08em", color: "#8e8e93", textTransform: "uppercase",
    marginBottom: "6px", fontFamily: "monospace",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#2c2c2e", border: "1px solid #3a3a3c",
    borderRadius: "10px", padding: "10px 14px",
    color: "#f5f5f0", fontSize: "15px", outline: "none", colorScheme: "dark",
  };

  return (
    <>
      {scanning && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setScanning(false)}
        />
      )}

      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }} onClick={onClose}>
        <div style={{
          background: "#1c1c1e", border: "1px solid #2c2c2e",
          borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "460px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)", margin: "auto",
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            {productImg && (
              <img src={productImg} alt="" style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover", background: "#fff" }} />
            )}
            <h2 style={{ margin: 0, fontSize: "20px", fontFamily: "Georgia, serif", color: "#f5f5f0", fontWeight: 700 }}>
              {item ? "Edit Item" : "Add to Pantry"}
            </h2>
          </div>

          {/* Scan button */}
          {!item && (
            <button onClick={() => setScanning(true)} disabled={looking} style={{
              width: "100%", padding: "13px", borderRadius: "12px", marginBottom: "16px",
              background: looking ? "#2c2c2e" : "#1a3a5c",
              border: "1px solid #2a5a8c",
              color: looking ? "#6e6e73" : "#4a9edd",
              fontSize: "15px", fontWeight: 700, cursor: looking ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}>
              <span style={{ fontSize: "20px" }}>📷</span>
              {looking ? "Looking up product…" : "Scan Barcode"}
            </button>
          )}

          {/* Lookup message */}
          {lookupMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px",
              background: lookupMsg.type === "success" ? "#34c75915" : "#ff3b3015",
              border: `1px solid ${lookupMsg.type === "success" ? "#34c75940" : "#ff3b3040"}`,
              color: lookupMsg.type === "success" ? "#34c759" : "#ff3b30",
            }}>
              {lookupMsg.text}
            </div>
          )}

          {/* Divider */}
          {!item && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: "#2c2c2e" }} />
              <span style={{ fontSize: "11px", color: "#48484a", fontFamily: "monospace" }}>or fill in manually</span>
              <div style={{ flex: 1, height: "1px", background: "#2c2c2e" }} />
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Item Name</label>
            <input type="text" value={form.name} placeholder="e.g. Arborio Rice"
              onChange={e => set("name", e.target.value)} style={inputStyle} />
          </div>

          {/* Qty + Unit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input type="number" min="0" value={form.quantity}
                onChange={e => set("quantity", parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, fontFamily: "monospace" }} />
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <input type="text" value={form.unit} placeholder="cans, kg, boxes…"
                onChange={e => set("unit", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Expiry */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Expiry Date</label>
            <input type="date" value={form.expiry}
              onChange={e => set("expiry", e.target.value)}
              style={{ ...inputStyle, fontFamily: "monospace" }} />
          </div>

          {/* Category + Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <select value={form.location} onChange={e => set("location", e.target.value)} style={inputStyle}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={form.notes} placeholder="Optional note…"
              onChange={e => set("notes", e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", borderRadius: "12px",
              background: "#2c2c2e", border: "none", color: "#8e8e93",
              fontSize: "15px", fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => form.name.trim() && onSave({ ...form, quantity: Number(form.quantity) })} style={{
              flex: 2, padding: "12px", borderRadius: "12px",
              background: "#c8a96e", border: "none", color: "#1c1c1e",
              fontSize: "15px", fontWeight: 700, cursor: "pointer",
            }}>
              {item ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
